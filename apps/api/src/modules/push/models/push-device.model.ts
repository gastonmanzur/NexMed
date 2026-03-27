import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const pushPlatforms = ['web', 'android', 'ios'] as const;
export type PushPlatform = (typeof pushPlatforms)[number];

export const pushChannels = ['web_push', 'mobile_push'] as const;
export type PushChannel = (typeof pushChannels)[number];

export const pushTokenStatuses = ['active', 'invalid', 'revoked'] as const;
export type PushTokenStatus = (typeof pushTokenStatuses)[number];

const pushDeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    channel: {
      type: String,
      enum: pushChannels,
      required: true
    },
    platform: {
      type: String,
      enum: pushPlatforms,
      required: true
    },
    status: {
      type: String,
      enum: pushTokenStatuses,
      default: 'active'
    },
    deviceName: {
      type: String,
      required: false
    },
    appVersion: {
      type: String,
      required: false
    },
    osVersion: {
      type: String,
      required: false
    },
    userAgent: {
      type: String,
      required: false
    },
    lastSeenAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    invalidatedAt: {
      type: Date,
      required: false
    }
  },
  {
    timestamps: true
  }
);

pushDeviceSchema.index({ userId: 1, platform: 1, channel: 1, status: 1 });

export type PushDeviceDocument = InferSchemaType<typeof pushDeviceSchema> & { _id: mongoose.Types.ObjectId };
export const PushDeviceModel: Model<PushDeviceDocument> = mongoose.model<PushDeviceDocument>('PushDevice', pushDeviceSchema);
