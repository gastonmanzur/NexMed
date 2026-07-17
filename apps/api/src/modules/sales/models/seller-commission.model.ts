import mongoose, { type InferSchemaType, type Model } from "mongoose";

const sellerCommissionSchema = new mongoose.Schema(
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
      index: true,
    },
    paymentTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      required: true,
      unique: true,
    },
    baseAmount: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "ARS" },
    status: {
      type: String,
      enum: ["held", "available", "settled", "reversed"],
      required: true,
      default: "held",
      index: true,
    },
    availableAt: { type: Date, required: true },
    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerSettlement",
      default: null,
    },
  },
  { timestamps: true },
);

export type SellerCommissionDocument = InferSchemaType<
  typeof sellerCommissionSchema
> & { _id: mongoose.Types.ObjectId };
export const SellerCommissionModel: Model<SellerCommissionDocument> =
  mongoose.model<SellerCommissionDocument>(
    "SellerCommission",
    sellerCommissionSchema,
  );
