import mongoose from 'mongoose';
import { AppError } from '../../../core/errors.js';
import { OrganizationMemberRepository } from '../../organizations/repositories/organization-member.repository.js';
import { UserModel } from '../../auth/models/user.model.js';
import { FeedbackRepository } from '../repositories/feedback.repository.js';

export class FeedbackService {
  constructor(
    private readonly feedbackRepository = new FeedbackRepository(),
    private readonly organizationMembers = new OrganizationMemberRepository()
  ) {}

  async createFeedback(input: {
    userId: string;
    globalRole: 'super_admin' | 'user';
    organizationId?: string | undefined;
    category: 'bug' | 'ux' | 'feature_request' | 'content' | 'support' | 'other';
    severity?: 'critical' | 'high' | 'medium' | 'low' | undefined;
    title?: string | undefined;
    message: string;
    pagePath?: string | undefined;
    relatedEntityType?: string | undefined;
    relatedEntityId?: string | undefined;
  }) {
    const user = await UserModel.findById(input.userId).lean();
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    let roleSnapshot: string | undefined;
    let source: 'center_admin' | 'patient' | 'beta_internal' = input.globalRole === 'super_admin' ? 'beta_internal' : 'patient';

    let resolvedOrganizationId: string | undefined;
    if (input.organizationId) {
      if (!mongoose.isValidObjectId(input.organizationId)) {
        throw new AppError('INVALID_ORGANIZATION_ID', 400, 'Invalid organization id');
      }

      const membership = await this.organizationMembers.findByOrganizationAndUser(input.organizationId, input.userId);
      if (membership?.status === 'active') {
        resolvedOrganizationId = input.organizationId;
        roleSnapshot = membership.role;
        if (membership.role === 'owner' || membership.role === 'admin' || membership.role === 'staff') {
          source = 'center_admin';
        }
      }
    }

    if (!roleSnapshot) {
      roleSnapshot = input.globalRole === 'super_admin' ? 'super_admin' : user.role;
    }

    const createPayload: {
      userId: string;
      organizationId?: string | null;
      roleSnapshot?: string;
      category: 'bug' | 'ux' | 'feature_request' | 'content' | 'support' | 'other';
      severity: 'critical' | 'high' | 'medium' | 'low';
      title?: string;
      message: string;
      source: 'center_admin' | 'patient' | 'beta_internal';
      pagePath?: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
    } = {
      userId: input.userId,
      category: input.category,
      severity: input.severity ?? 'medium',
      message: input.message,
      source
    };

    if (resolvedOrganizationId) createPayload.organizationId = resolvedOrganizationId;
    if (roleSnapshot) createPayload.roleSnapshot = roleSnapshot;
    if (input.title) createPayload.title = input.title;
    if (input.pagePath) createPayload.pagePath = input.pagePath;
    if (input.relatedEntityType) createPayload.relatedEntityType = input.relatedEntityType;
    if (input.relatedEntityId) createPayload.relatedEntityId = input.relatedEntityId;

    const created = await this.feedbackRepository.create(createPayload);

    return {
      id: created._id.toString(),
      status: created.status,
      createdAt: created.createdAt.toISOString()
    };
  }

  async listAdminFeedback(input: {
    page: number;
    limit: number;
    status?: 'new' | 'triaged' | 'planned' | 'resolved' | 'wont_fix';
    category?: 'bug' | 'ux' | 'feature_request' | 'content' | 'support' | 'other';
  }) {
    const data = await this.feedbackRepository.listAdmin(input);

    return {
      items: data.items.map((item) => ({
        id: item._id.toString(),
        userId: item.userId.toString(),
        organizationId: item.organizationId ? item.organizationId.toString() : null,
        roleSnapshot: item.roleSnapshot ?? null,
        category: item.category,
        severity: item.severity,
        title: item.title ?? null,
        message: item.message,
        source: item.source,
        pagePath: item.pagePath ?? null,
        relatedEntityType: item.relatedEntityType ?? null,
        relatedEntityId: item.relatedEntityId ?? null,
        status: item.status,
        adminNotes: item.adminNotes ?? null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      })),
      total: data.total,
      page: data.page,
      limit: data.limit
    };
  }

  async updateAdminFeedback(input: {
    feedbackId: string;
    status: 'new' | 'triaged' | 'planned' | 'resolved' | 'wont_fix';
    adminNotes?: string | undefined;
    severity?: 'critical' | 'high' | 'medium' | 'low' | undefined;
  }) {
    if (!mongoose.isValidObjectId(input.feedbackId)) {
      throw new AppError('INVALID_FEEDBACK_ID', 400, 'Invalid feedback id');
    }

    const updated = await this.feedbackRepository.updateAdmin(input.feedbackId, {
      status: input.status,
      adminNotes: input.adminNotes,
      severity: input.severity
    });

    if (!updated) {
      throw new AppError('FEEDBACK_NOT_FOUND', 404, 'Feedback not found');
    }

    return {
      id: updated._id.toString(),
      status: updated.status,
      severity: updated.severity,
      adminNotes: updated.adminNotes ?? null,
      updatedAt: updated.updatedAt.toISOString()
    };
  }
}
