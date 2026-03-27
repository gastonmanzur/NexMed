import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const actionTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true
    },
    type: {
      type: String,
      enum: ['verify_email', 'reset_password'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    consumedAt: {
      type: Date,
      required: false,
      default: null
    }
  },
  { timestamps: true }
);

actionTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type ActionTokenDocument = InferSchemaType<typeof actionTokenSchema> & { _id: mongoose.Types.ObjectId };
export const ActionTokenModel: Model<ActionTokenDocument> = mongoose.model<ActionTokenDocument>(
  'ActionToken',
  actionTokenSchema
);
