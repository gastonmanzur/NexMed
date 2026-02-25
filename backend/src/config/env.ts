import dotenv from "dotenv";
dotenv.config();

const emailProvider = (process.env.EMAIL_PROVIDER ?? "smtp") as "resend" | "smtp" | "ethereal";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  mongoUri: process.env.MONGO_URI ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  timezone: process.env.TZ ?? "America/Argentina/Buenos_Aires",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  publicWebBaseUrl: process.env.PUBLIC_WEB_BASE_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:5173",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 0,
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "",
  reminderTestMode: process.env.REMINDER_TEST_MODE === "true",
  reminderWorkerEnabled: process.env.REMINDER_WORKER_ENABLED !== "false",
  reminderPollIntervalMs: Number(process.env.REMINDER_POLL_INTERVAL_MS ?? 5000),
  reminderTestDayUnit: (process.env.REMINDER_TEST_DAY_UNIT ?? "minutes") as "minutes" | "seconds",
  reminderTestHourUnit: (process.env.REMINDER_TEST_HOUR_UNIT ?? "seconds") as "minutes" | "seconds",
  reminderTestHourMultiplier: Number(process.env.REMINDER_TEST_HOUR_MULTIPLIER ?? 60),
  emailProvider,
  emailFrom: process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? "NexMed <no-reply@nexmed.local>",
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:5173",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFrom: process.env.RESEND_FROM ?? "",
  smtpSecure: process.env.SMTP_SECURE === "true",
  etherealHost: process.env.ETHEREAL_HOST ?? "smtp.ethereal.email",
  etherealPort: process.env.ETHEREAL_PORT ? Number(process.env.ETHEREAL_PORT) : 587,
  etherealUser: process.env.ETHEREAL_USER ?? "",
  etherealPass: process.env.ETHEREAL_PASS ?? "",
  etherealSecure: process.env.ETHEREAL_SECURE === "true",
  emailWorkerEnabled: process.env.EMAIL_WORKER_ENABLED !== "false",
};

if (!env.mongoUri) throw new Error("Missing MONGO_URI");
if (!env.jwtSecret) throw new Error("Missing JWT_SECRET");
