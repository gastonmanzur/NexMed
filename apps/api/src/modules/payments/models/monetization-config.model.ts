import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const monetizationModes = ['one_time_only', 'subscriptions_only', 'both'] as const;
export const subscriptionPeriodModes = ['monthly', 'yearly', 'both'] as const;

const monetizationConfigSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, required: true, unique: true, default: 'default' },
    monetizationMode: {
      type: String,
      enum: monetizationModes,
      required: true,
      default: 'both'
    },
    subscriptionPeriodMode: {
      type: String,
      enum: subscriptionPeriodModes,
      required: true,
      default: 'both'
    }
  },
  { timestamps: true }
);

export type MonetizationConfigDocument = InferSchemaType<typeof monetizationConfigSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const MonetizationConfigModel: Model<MonetizationConfigDocument> = mongoose.model<MonetizationConfigDocument>(
  'MonetizationConfig',
  monetizationConfigSchema
);
