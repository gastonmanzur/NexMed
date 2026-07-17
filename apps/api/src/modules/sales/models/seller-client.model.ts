import mongoose, { type InferSchemaType, type Model } from "mongoose";

const sellerClientSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerProfile",
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
      index: true,
    },
    referralCode: { type: String, required: true, uppercase: true },
    attributedAt: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ["active", "lost"],
      required: true,
      default: "active",
      index: true,
    },
    lostAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type SellerClientDocument = InferSchemaType<
  typeof sellerClientSchema
> & { _id: mongoose.Types.ObjectId };
export const SellerClientModel: Model<SellerClientDocument> =
  mongoose.model<SellerClientDocument>("SellerClient", sellerClientSchema);
