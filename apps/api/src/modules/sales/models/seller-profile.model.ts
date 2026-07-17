import mongoose, { type InferSchemaType, type Model } from "mongoose";

export const sellerStatuses = [
  "invited",
  "active",
  "inactive",
  "blocked",
] as const;
export const commissionTypes = ["percentage", "fixed"] as const;

const sellerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      unique: true,
      sparse: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    phone: { type: String, trim: true, default: null },
    referralCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: sellerStatuses,
      required: true,
      default: "invited",
      index: true,
    },
    commissionType: { type: String, enum: commissionTypes, required: true },
    commissionRate: { type: Number, required: true, min: 0 },
    commissionDurationMonths: { type: Number, min: 1, default: null },
    commissionHoldDays: { type: Number, required: true, min: 0, default: 0 },
    invitedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitationTokenHash: { type: String, default: null, select: false },
    invitationExpiresAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    notes: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

export type SellerProfileDocument = InferSchemaType<
  typeof sellerProfileSchema
> & { _id: mongoose.Types.ObjectId };
export const SellerProfileModel: Model<SellerProfileDocument> =
  mongoose.model<SellerProfileDocument>("SellerProfile", sellerProfileSchema);
