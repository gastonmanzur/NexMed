import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const organizationMemberRoles = ['owner', 'admin', 'staff', 'patient'] as const;
export const organizationMemberStatuses = ['active', 'inactive', 'blocked'] as const;

const organizationMemberSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    role: { type: String, enum: organizationMemberRoles, required: true },
    status: { type: String, enum: organizationMemberStatuses, default: 'active' },
    joinedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export type OrganizationMemberDocument = InferSchemaType<typeof organizationMemberSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const OrganizationMemberModel: Model<OrganizationMemberDocument> = mongoose.model<OrganizationMemberDocument>(
  'OrganizationMember',
  organizationMemberSchema
);
