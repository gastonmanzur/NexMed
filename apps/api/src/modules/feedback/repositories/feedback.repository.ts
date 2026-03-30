import { FeedbackEntryModel, type FeedbackEntryDocument } from '../models/feedback-entry.model.js';

interface CreateFeedbackInput {
  userId: string;
  organizationId?: string | null;
  roleSnapshot?: string | undefined;
  category: 'bug' | 'ux' | 'feature_request' | 'content' | 'support' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title?: string | undefined;
  message: string;
  source: 'center_admin' | 'patient' | 'beta_internal';
  pagePath?: string | undefined;
  relatedEntityType?: string | undefined;
  relatedEntityId?: string | undefined;
}

interface ListAdminFeedbackInput {
  page: number;
  limit: number;
  status?: 'new' | 'triaged' | 'planned' | 'resolved' | 'wont_fix';
  category?: 'bug' | 'ux' | 'feature_request' | 'content' | 'support' | 'other';
}

export class FeedbackRepository {
  async create(input: CreateFeedbackInput): Promise<FeedbackEntryDocument> {
    const created = await FeedbackEntryModel.create({
      userId: input.userId,
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      ...(input.roleSnapshot ? { roleSnapshot: input.roleSnapshot } : {}),
      category: input.category,
      severity: input.severity,
      ...(input.title ? { title: input.title } : {}),
      message: input.message,
      source: input.source,
      ...(input.pagePath ? { pagePath: input.pagePath } : {}),
      ...(input.relatedEntityType ? { relatedEntityType: input.relatedEntityType } : {}),
      ...(input.relatedEntityId ? { relatedEntityId: input.relatedEntityId } : {})
    });

    return created;
  }

  async listAdmin(input: ListAdminFeedbackInput): Promise<{ items: FeedbackEntryDocument[]; total: number; page: number; limit: number }> {
    const query: Record<string, unknown> = {};
    if (input.status) query.status = input.status;
    if (input.category) query.category = input.category;

    const skip = (input.page - 1) * input.limit;
    const [items, total] = await Promise.all([
      FeedbackEntryModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(input.limit).lean(),
      FeedbackEntryModel.countDocuments(query)
    ]);

    return {
      items: items as FeedbackEntryDocument[],
      total,
      page: input.page,
      limit: input.limit
    };
  }

  async findById(feedbackId: string): Promise<FeedbackEntryDocument | null> {
    return FeedbackEntryModel.findById(feedbackId).exec();
  }

  async updateAdmin(
    feedbackId: string,
    input: {
      status: 'new' | 'triaged' | 'planned' | 'resolved' | 'wont_fix';
      adminNotes?: string | undefined;
      severity?: 'critical' | 'high' | 'medium' | 'low' | undefined;
    }
  ): Promise<FeedbackEntryDocument | null> {
    return FeedbackEntryModel.findByIdAndUpdate(
      feedbackId,
      {
        $set: {
          status: input.status,
          ...(input.adminNotes !== undefined ? { adminNotes: input.adminNotes } : {}),
          ...(input.severity ? { severity: input.severity } : {})
        }
      },
      { new: true }
    ).exec();
  }
}
