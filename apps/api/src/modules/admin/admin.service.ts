import mongoose from 'mongoose';
import { AppError } from '../../core/errors.js';
import { UserModel } from '../auth/models/user.model.js';
import { PushService } from '../push/services/push.service.js';
import { PushDeviceModel } from '../push/models/push-device.model.js';
import { PaymentOrderModel, internalPaymentStatuses, orderTypes } from '../payments/models/payment-order.model.js';
import { PaymentTransactionModel } from '../payments/models/payment-transaction.model.js';
import { SubscriptionModel, subscriptionPeriods, subscriptionStatuses } from '../payments/models/subscription.model.js';
import { MonetizationConfigModel, monetizationModes, subscriptionPeriodModes } from '../payments/models/monetization-config.model.js';
import { MonetizationConfigRepository } from '../payments/repositories/monetization-config.repository.js';

export class AdminService {
  constructor(
    private readonly pushService = new PushService(),
    private readonly monetizationConfigRepository = new MonetizationConfigRepository()
  ) {}

  async getDashboardSummary() {
    const [users, adminUsers, payments, subscriptions, pushDevices, usersWithAvatar] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ role: 'admin' }),
      PaymentTransactionModel.countDocuments(),
      SubscriptionModel.countDocuments(),
      PushDeviceModel.countDocuments({ status: 'active' }),
      UserModel.countDocuments({ avatar: { $exists: true } })
    ]);

    return {
      users,
      adminUsers,
      regularUsers: users - adminUsers,
      payments,
      subscriptions,
      pushDevices,
      usersWithAvatar
    };
  }

  async listUsers(filters: { search?: string; role?: 'admin' | 'user'; provider?: 'local' | 'google'; emailVerified?: boolean; hasAvatar?: boolean; limit: number; page: number }) {
    const query: Record<string, unknown> = {};

    if (filters.search) {
      query.email = { $regex: filters.search, $options: 'i' };
    }

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.provider) {
      query.provider = filters.provider;
    }

    if (typeof filters.emailVerified === 'boolean') {
      query.emailVerified = filters.emailVerified;
    }

    if (typeof filters.hasAvatar === 'boolean') {
      query.avatar = filters.hasAvatar ? { $exists: true } : { $exists: false };
    }

    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      UserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit).lean(),
      UserModel.countDocuments(query)
    ]);

    return {
      items: items.map((user) => ({
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        provider: user.provider,
        emailVerified: user.emailVerified,
        avatar: user.avatar
          ? {
              url: user.avatar.url,
              updatedAt: user.avatar.updatedAt.toISOString()
            }
          : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null
      })),
      total,
      page: filters.page,
      limit: filters.limit
    };
  }

  async updateUserRole(actorUserId: string, targetUserId: string, role: 'admin' | 'user') {
    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new AppError('INVALID_USER_ID', 400, 'Invalid target user id');
    }

    if (actorUserId === targetUserId && role !== 'admin') {
      throw new AppError('ROLE_CHANGE_BLOCKED', 409, 'Admin cannot remove own admin role');
    }

    const updated = await UserModel.findByIdAndUpdate(targetUserId, { $set: { role } }, { new: true }).lean();
    if (!updated) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    return {
      id: updated._id.toString(),
      email: updated.email,
      role: updated.role,
      provider: updated.provider,
      emailVerified: updated.emailVerified
    };
  }

  async listPayments(filters: { status?: (typeof internalPaymentStatuses)[number]; type?: (typeof orderTypes)[number]; userId?: string; limit: number; page: number }) {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.userId) query.userId = filters.userId;

    const skip = (filters.page - 1) * filters.limit;
    const [orders, total] = await Promise.all([
      PaymentOrderModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit).lean(),
      PaymentOrderModel.countDocuments(query)
    ]);

    const userIds = Array.from(new Set(orders.map((order) => order.userId.toString())));
    const orderIds = orders.map((order) => order._id);

    const [users, transactions] = await Promise.all([
      UserModel.find({ _id: { $in: userIds } }, { email: 1 }).lean(),
      PaymentTransactionModel.find({ orderId: { $in: orderIds } }).lean()
    ]);

    const usersMap = new Map(users.map((user) => [user._id.toString(), user.email]));
    const txMap = new Map(transactions.map((tx) => [tx.orderId.toString(), tx]));

    return {
      items: orders.map((order) => {
        const transaction = txMap.get(order._id.toString());
        return {
          id: order._id.toString(),
          type: order.type,
          status: order.status,
          amount: order.amount,
          currency: order.currency,
          userId: order.userId.toString(),
          userEmail: usersMap.get(order.userId.toString()) ?? null,
          externalReference: order.externalReference,
          providerOrderId: order.providerOrderId ?? null,
          transactionId: transaction?._id.toString() ?? null,
          methodType: transaction?.methodType ?? null,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString()
        };
      }),
      total,
      page: filters.page,
      limit: filters.limit
    };
  }

  async listSubscriptions(filters: {
    status?: (typeof subscriptionStatuses)[number];
    period?: (typeof subscriptionPeriods)[number];
    userId?: string;
    limit: number;
    page: number;
  }) {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.period) query.period = filters.period;
    if (filters.userId) query.userId = filters.userId;

    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      SubscriptionModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit).lean(),
      SubscriptionModel.countDocuments(query)
    ]);

    const userIds = Array.from(new Set(items.map((item) => item.userId.toString())));
    const users = await UserModel.find({ _id: { $in: userIds } }, { email: 1 }).lean();
    const usersMap = new Map(users.map((user) => [user._id.toString(), user.email]));

    return {
      items: items.map((subscription) => ({
        id: subscription._id.toString(),
        userId: subscription.userId.toString(),
        userEmail: usersMap.get(subscription.userId.toString()) ?? null,
        status: subscription.status,
        period: subscription.period,
        planCode: subscription.planCode,
        title: subscription.title,
        amount: subscription.amount,
        currency: subscription.currency,
        providerPreapprovalId: subscription.providerPreapprovalId ?? null,
        externalReference: subscription.externalReference,
        nextBillingDate: subscription.nextBillingDate ? subscription.nextBillingDate.toISOString() : null,
        createdAt: subscription.createdAt.toISOString(),
        updatedAt: subscription.updatedAt.toISOString()
      })),
      total,
      page: filters.page,
      limit: filters.limit
    };
  }

  sendNotification(input: { actorUserId: string; actorRole: 'admin' | 'user'; targetUserId: string; title: string; body: string }) {
    return this.pushService.sendToUser(input);
  }

  async listAvatars(filters: { hasAvatar?: boolean; search?: string; limit: number; page: number }) {
    const query: Record<string, unknown> = {};
    if (typeof filters.hasAvatar === 'boolean') {
      query.avatar = filters.hasAvatar ? { $exists: true } : { $exists: false };
    }
    if (filters.search) {
      query.email = { $regex: filters.search, $options: 'i' };
    }

    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      UserModel.find(query).sort({ updatedAt: -1 }).skip(skip).limit(filters.limit).lean(),
      UserModel.countDocuments(query)
    ]);

    return {
      items: items.map((item) => ({
        userId: item._id.toString(),
        email: item.email,
        hasAvatar: Boolean(item.avatar),
        avatarUrl: item.avatar?.url ?? null,
        avatarUpdatedAt: item.avatar?.updatedAt ? item.avatar.updatedAt.toISOString() : null,
        updatedAt: item.updatedAt.toISOString()
      })),
      total,
      page: filters.page,
      limit: filters.limit
    };
  }

  async deleteAvatar(actorUserId: string, targetUserId: string, actorRole: 'admin' | 'user') {
    if (actorRole !== 'admin') {
      throw new AppError('FORBIDDEN', 403, 'Insufficient permissions');
    }
    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new AppError('INVALID_USER_ID', 400, 'Invalid target user id');
    }
    const user = await UserModel.findById(targetUserId).lean();
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }
    await UserModel.updateOne({ _id: targetUserId }, { $unset: { avatar: '' } }).exec();
    return { actorUserId };
  }

  getMonetizationConfig() {
    return this.monetizationConfigRepository.getConfig();
  }

  async updateMonetizationConfig(input: { monetizationMode: (typeof monetizationModes)[number]; subscriptionPeriodMode: (typeof subscriptionPeriodModes)[number] }) {
    const config = await MonetizationConfigModel.findOneAndUpdate(
      { singletonKey: 'default' },
      { $set: input, $setOnInsert: { singletonKey: 'default' } },
      { upsert: true, new: true }
    ).lean();

    return {
      monetizationMode: config.monetizationMode,
      subscriptionPeriodMode: config.subscriptionPeriodMode
    };
  }
}
