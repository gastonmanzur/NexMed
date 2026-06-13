import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const organizationHealthInsuranceStatuses = ['active', 'inactive'] as const;

const organizationHealthInsurancePlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: { type: String, required: false, trim: true, maxlength: 40, default: null },
    active: { type: Boolean, required: true, default: true }
  },
  { _id: false, timestamps: true }
);

const organizationHealthInsuranceSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    status: { type: String, enum: organizationHealthInsuranceStatuses, required: true, default: 'active', index: true },
    requiresMemberNumber: { type: Boolean, required: true, default: false },
    requiresPlan: { type: Boolean, required: true, default: false },
    plans: { type: [organizationHealthInsurancePlanSchema], required: true, default: [] },
    notes: { type: String, required: false, trim: true, maxlength: 500, default: null }
  },
  { timestamps: true }
);

organizationHealthInsuranceSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export type OrganizationHealthInsuranceDocument = InferSchemaType<typeof organizationHealthInsuranceSchema> & { _id: mongoose.Types.ObjectId };

export const OrganizationHealthInsuranceModel: Model<OrganizationHealthInsuranceDocument> = mongoose.model<OrganizationHealthInsuranceDocument>(
  'OrganizationHealthInsurance',
  organizationHealthInsuranceSchema
);
