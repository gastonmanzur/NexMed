import mongoose, { type InferSchemaType, type Model } from "mongoose";

const sellerSettlementSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerProfile",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "ARS" },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      required: true,
      default: "pending",
    },
    periodFrom: { type: Date, required: true },
    periodTo: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    paymentReference: { type: String, trim: true, default: null },
    notes: { type: String, trim: true, default: null },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export type SellerSettlementDocument = InferSchemaType<
  typeof sellerSettlementSchema
> & { _id: mongoose.Types.ObjectId };
export const SellerSettlementModel: Model<SellerSettlementDocument> =
  mongoose.model<SellerSettlementDocument>(
    "SellerSettlement",
    sellerSettlementSchema,
  );
