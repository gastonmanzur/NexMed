import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const webhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    eventKey: { type: String, required: true },
    topic: { type: String, required: true },
    processedAt: { type: Date, required: true, default: () => new Date() },
    payloadHash: { type: String, required: false }
  },
  { timestamps: true }
);

webhookEventSchema.index({ provider: 1, eventKey: 1 }, { unique: true });

export type WebhookEventDocument = InferSchemaType<typeof webhookEventSchema> & { _id: mongoose.Types.ObjectId };
export const WebhookEventModel: Model<WebhookEventDocument> = mongoose.model<WebhookEventDocument>('WebhookEvent', webhookEventSchema);
