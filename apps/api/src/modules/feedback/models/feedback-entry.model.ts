import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const feedbackCategories = ['bug', 'ux', 'feature_request', 'content', 'support', 'other'] as const;
export const feedbackSeverities = ['critical', 'high', 'medium', 'low'] as const;
export const feedbackSources = ['center_admin', 'patient', 'beta_internal'] as const;
export const feedbackStatuses = ['new', 'triaged', 'planned', 'resolved', 'wont_fix'] as const;

const feedbackEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Organization', index: true },
    roleSnapshot: { type: String, required: false, trim: true, maxlength: 60 },
    category: { type: String, required: true, enum: feedbackCategories, index: true },
    severity: { type: String, required: true, enum: feedbackSeverities, default: 'medium', index: true },
    title: { type: String, required: false, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    source: { type: String, required: true, enum: feedbackSources, index: true },
    pagePath: { type: String, required: false, trim: true, maxlength: 300 },
    relatedEntityType: { type: String, required: false, trim: true, maxlength: 80 },
    relatedEntityId: { type: String, required: false, trim: true, maxlength: 120 },
    status: { type: String, required: true, enum: feedbackStatuses, default: 'new', index: true },
    adminNotes: { type: String, required: false, trim: true, maxlength: 2000 }
  },
  { timestamps: true }
);

export type FeedbackEntryDocument = InferSchemaType<typeof feedbackEntrySchema> & { _id: mongoose.Types.ObjectId };

export const FeedbackEntryModel: Model<FeedbackEntryDocument> = mongoose.model<FeedbackEntryDocument>(
  'FeedbackEntry',
  feedbackEntrySchema
);
