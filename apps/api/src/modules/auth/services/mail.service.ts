import nodemailer from 'nodemailer';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';

export interface MailProvider {
  send(input: { to: string; subject: string; html: string; text: string }): Promise<void>;
}

class NodemailerProvider implements MailProvider {
  private readonly transporter = env.SMTP_HOST
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: (env.SMTP_PORT ?? 587) === 465,
        auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
      })
    : nodemailer.createTransport({ jsonTransport: true });

  async send(input: { to: string; subject: string; html: string; text: string }): Promise<void> {
    const info = await this.transporter.sendMail({
      from: env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    });

    if (!env.SMTP_HOST) {
      logger.info({ mailPreview: info }, 'Email preview (jsonTransport)');
    }
  }
}

const layout = (title: string, message: string, ctaLabel: string, ctaUrl: string): { html: string; text: string } => ({
  html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2>${title}</h2><p>${message}</p><p><a href="${ctaUrl}">${ctaLabel}</a></p></div>`,
  text: `${title}\n\n${message}\n\n${ctaLabel}: ${ctaUrl}`
});

export class MailService {
  constructor(private readonly provider: MailProvider = new NodemailerProvider()) {}

  async sendVerifyEmail(to: string, verifyUrl: string): Promise<void> {
    const content = layout('Verify your email', 'Confirm your account to continue.', 'Verify account', verifyUrl);
    await this.provider.send({ to, subject: 'Verify your email', ...content });
  }

  async sendResetPassword(to: string, resetUrl: string): Promise<void> {
    const content = layout('Reset your password', 'Use the following link to reset your password.', 'Reset password', resetUrl);
    await this.provider.send({ to, subject: 'Reset password', ...content });
  }
}
