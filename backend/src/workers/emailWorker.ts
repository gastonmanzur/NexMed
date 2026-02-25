import { Types } from "mongoose";
import { env } from "../config/env";
import { EmailJob } from "../models/EmailJob";
import { EmailLog } from "../models/EmailLog";
import { getEmailProvider } from "../services/email/emailProvider";
import { renderTemplate } from "../services/email/renderTemplate";

const POLL_MS = 4_000;
const BATCH_SIZE = 20;
const BACKOFF_MS = [0, 30_000, 120_000, 600_000, 3_600_000];
const MAX_ATTEMPTS = 5;

let started = false;
let timer: NodeJS.Timeout | null = null;

function backoffForAttempt(nextAttempt: number) {
  return BACKOFF_MS[Math.min(nextAttempt, BACKOFF_MS.length - 1)] ?? 3_600_000;
}

async function processJob(jobId: Types.ObjectId) {
  const locked = await EmailJob.findOneAndUpdate(
    { _id: jobId, status: "pending", nextRunAt: { $lte: new Date() } },
    { $inc: { attempts: 1 } },
    { new: true }
  );

  if (!locked) return;

  const provider = getEmailProvider();
  const rendered = renderTemplate(locked);
  const attachments = rendered.ics ? [rendered.ics] : [];

  try {
    const sent = await provider.send({
      to: locked.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      attachments,
    });

    await EmailJob.updateOne({ _id: locked._id }, { status: "sent", lastError: "", nextRunAt: new Date() });
    await EmailLog.create({
      jobId: locked._id,
      provider: provider.name,
      to: locked.to,
      subject: rendered.subject,
      ...(sent.messageId ? { providerMessageId: sent.messageId } : {}),
      status: "sent",
    });
  } catch (error: any) {
    const attempts = locked.attempts;
    const exhausted = attempts >= MAX_ATTEMPTS;
    const nextRunAt = new Date(Date.now() + backoffForAttempt(attempts));
    const message = String(error?.message ?? error);

    await EmailJob.updateOne(
      { _id: locked._id },
      {
        status: exhausted ? "failed" : "pending",
        lastError: message,
        nextRunAt,
      }
    );

    await EmailLog.create({
      jobId: locked._id,
      provider: provider.name,
      to: locked.to,
      subject: rendered.subject,
      status: "failed",
      error: message,
    });
  }
}

async function tick() {
  const jobs = await EmailJob.find({ status: "pending", nextRunAt: { $lte: new Date() } })
    .sort({ nextRunAt: 1 })
    .limit(BATCH_SIZE)
    .select("_id")
    .lean();

  for (const job of jobs) {
    await processJob(job._id);
  }
}

export function startEmailWorker() {
  if (started || !env.emailWorkerEnabled) return;
  started = true;

  timer = setInterval(() => {
    tick().catch((error) => console.error("[emailWorker]", error));
  }, POLL_MS);

  tick().catch((error) => console.error("[emailWorker]", error));
}

export function stopEmailWorker() {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}
