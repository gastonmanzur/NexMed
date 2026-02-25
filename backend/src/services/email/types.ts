import { EmailJobType } from "../../models/EmailJob";

export type EmailAttachment = {
  filename: string;
  content: string;
  contentType: string;
};

export type EmailTemplateResult = {
  subject: string;
  html: string;
  text: string;
  ics?: EmailAttachment;
};

export type ProviderSendInput = {
  to: string[];
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
};

export type AppointmentEmailEventType = EmailJobType;
