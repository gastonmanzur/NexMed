import { Schema, model, Types } from "mongoose";

export type EmailProviderName = "resend" | "smtp" | "ethereal";

export interface EmailLogDocument {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  provider: EmailProviderName;
  to: string[];
  subject: string;
  providerMessageId?: string;
  status: "sent" | "failed";
  error?: string;
  createdAt: Date;
}

const emailLogSchema = new Schema<EmailLogDocument>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "EmailJob", required: true, index: true },
    provider: { type: String, enum: ["resend", "smtp", "ethereal"], required: true },
    to: { type: [String], default: [] },
    subject: { type: String, required: true },
    providerMessageId: { type: String, default: "" },
    status: { type: String, enum: ["sent", "failed"], required: true, index: true },
    error: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const EmailLog = model<EmailLogDocument>("EmailLog", emailLogSchema);
