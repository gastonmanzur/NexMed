import net from "node:net";
import tls from "node:tls";
import crypto from "node:crypto";
import { env } from "../../config/env";
import { EmailAttachment, ProviderSendInput } from "./types";

type ProviderSendResult = { messageId?: string };

export interface EmailProvider {
  readonly name: "resend" | "smtp" | "ethereal";
  send(input: ProviderSendInput): Promise<ProviderSendResult>;
}

function asArray<T>(value: T[] | undefined) {
  return (value ?? []).filter(Boolean as any) as T[];
}

function chunkBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function makeMimeMessage(params: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}) {
  const mixedBoundary = `mixed_${crypto.randomUUID()}`;
  const altBoundary = `alt_${crypto.randomUUID()}`;

  const lines = [
    `From: ${params.from}`,
    `To: ${params.to.join(", ")}`,
    `Subject: ${params.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary=\"${mixedBoundary}\"`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary=\"${altBoundary}\"`,
    "",
    `--${altBoundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    chunkBase64(Buffer.from(params.text, "utf8").toString("base64")),
    `--${altBoundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    chunkBase64(Buffer.from(params.html, "utf8").toString("base64")),
    `--${altBoundary}--`,
  ];

  for (const attachment of params.attachments ?? []) {
    lines.push(`--${mixedBoundary}`);
    lines.push(`Content-Type: ${attachment.contentType}; name=\"${attachment.filename}\"`);
    lines.push("Content-Transfer-Encoding: base64");
    lines.push(`Content-Disposition: attachment; filename=\"${attachment.filename}\"`);
    lines.push("");
    lines.push(chunkBase64(Buffer.from(attachment.content, "utf8").toString("base64")));
  }

  lines.push(`--${mixedBoundary}--`, "");
  return lines.join("\r\n");
}

class SimpleSmtpClient {
  private socket: net.Socket | tls.TLSSocket;
  private buffer = "";

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
  }

  async readResponse() {
    return await new Promise<string>((resolve, reject) => {
      const onData = (data: Buffer) => {
        this.buffer += data.toString("utf8");
        const lines = this.buffer.split("\r\n");
        const complete = lines.filter(Boolean);
        const last = complete.length ? complete[complete.length - 1] ?? "" : "";
        if (/^\d{3} /.test(last)) {
          this.socket.off("data", onData);
          resolve(this.buffer);
          this.buffer = "";
        }
      };
      const onError = (err: Error) => {
        this.socket.off("data", onData);
        reject(err);
      };
      this.socket.on("data", onData);
      this.socket.once("error", onError);
    });
  }

  async sendCommand(command: string, expectedCode: string) {
    this.socket.write(`${command}\r\n`);
    const response = await this.readResponse();
    if (!response.trim().startsWith(expectedCode)) {
      throw new Error(`SMTP error ${command}: ${response.trim()}`);
    }
    return response;
  }

  close() {
    this.socket.end();
  }
}

async function sendViaSmtp(params: {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}) {
  const socket = params.secure
    ? tls.connect(params.port, params.host)
    : net.connect({ port: params.port, host: params.host });

  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("error", reject);
  });

  const client = new SimpleSmtpClient(socket);
  await client.readResponse();
  await client.sendCommand("EHLO nexmed.local", "250");

  if (params.user && params.pass) {
    await client.sendCommand("AUTH LOGIN", "334");
    await client.sendCommand(Buffer.from(params.user, "utf8").toString("base64"), "334");
    await client.sendCommand(Buffer.from(params.pass, "utf8").toString("base64"), "235");
  }

  await client.sendCommand(`MAIL FROM:<${params.from.match(/<(.+)>/)?.[1] ?? params.from}>`, "250");
  for (const recipient of params.to) {
    await client.sendCommand(`RCPT TO:<${recipient}>`, "250");
  }

  await client.sendCommand("DATA", "354");
  const mime = makeMimeMessage(params);
  socket.write(`${mime}\r\n.\r\n`);
  const queued = await client.readResponse();
  if (!queued.trim().startsWith("250")) {
    throw new Error(`SMTP DATA error: ${queued.trim()}`);
  }

  await client.sendCommand("QUIT", "221");
  client.close();
  const messageId = queued.match(/\b([A-Za-z0-9_.-]+)\b$/)?.[1];
  return messageId ? { messageId } : {};
}

class ResendProvider implements EmailProvider {
  readonly name = "resend" as const;

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    if (!env.resendApiKey) throw new Error("Missing RESEND_API_KEY");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.resendFrom || env.emailFrom,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments: asArray(input.attachments).map((attachment) => ({
          filename: attachment.filename,
          content: Buffer.from(attachment.content, "utf8").toString("base64"),
          content_type: attachment.contentType,
        })),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) {
      throw new Error(payload.message || `Resend error ${response.status}`);
    }

    return payload.id ? { messageId: payload.id } : {};
  }
}

class SmtpProvider implements EmailProvider {
  readonly name = "smtp" as const;

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    if (!env.smtpHost || !env.smtpPort) {
      throw new Error("Missing SMTP_HOST/SMTP_PORT");
    }

    return sendViaSmtp({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      from: env.emailFrom,
      ...(env.smtpUser ? { user: env.smtpUser } : {}),
      ...(env.smtpPass ? { pass: env.smtpPass } : {}),
      ...input,
    });
  }
}

class EtherealProvider implements EmailProvider {
  readonly name = "ethereal" as const;

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    const result = await sendViaSmtp({
      host: env.etherealHost,
      port: env.etherealPort,
      secure: env.etherealSecure,
      from: env.emailFrom,
      ...(env.etherealUser ? { user: env.etherealUser } : {}),
      ...(env.etherealPass ? { pass: env.etherealPass } : {}),
      ...input,
    });

    if (result.messageId) {
      console.log(`[email][ethereal] message queued ${result.messageId}`);
    } else {
      console.log("[email][ethereal] sent (provider did not return messageId)");
    }
    return result;
  }
}

export function getEmailProvider(): EmailProvider {
  switch (env.emailProvider) {
    case "resend":
      return new ResendProvider();
    case "ethereal":
      return new EtherealProvider();
    case "smtp":
    default:
      return new SmtpProvider();
  }
}
