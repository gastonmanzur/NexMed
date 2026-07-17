import crypto from "node:crypto";
import mongoose from "mongoose";
import { AppError } from "../../../core/errors.js";
import { env } from "../../../config/env.js";
import { UserModel } from "../../auth/models/user.model.js";
import { OrganizationModel } from "../../organizations/models/organization.model.js";
import { OrganizationSubscriptionModel } from "../../payments/models/organization-subscription.model.js";
import { SalesRepository } from "../repositories/sales.repository.js";

const hash = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");
const serialize = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value));

export interface CreateSellerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null | undefined;
  referralCode?: string | undefined;
  commissionType: "percentage" | "fixed";
  commissionRate: number;
  commissionDurationMonths?: number | null | undefined;
  commissionHoldDays: number;
  notes?: string | null | undefined;
}

export class SalesService {
  constructor(private readonly repository = new SalesRepository()) {}

  private async uniqueCode(requested?: string): Promise<string> {
    const base = requested
      ?.trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");
    if (base) {
      if (await this.repository.profiles.exists({ referralCode: base }))
        throw new AppError(
          "REFERRAL_CODE_EXISTS",
          409,
          "El código de referido ya existe",
        );
      return base;
    }
    for (let index = 0; index < 10; index += 1) {
      const code = `NX-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      if (!(await this.repository.profiles.exists({ referralCode: code })))
        return code;
    }
    throw new AppError(
      "CODE_GENERATION_FAILED",
      500,
      "No fue posible generar el código",
    );
  }

  async createSeller(actorUserId: string, input: CreateSellerInput) {
    const token = crypto.randomBytes(32).toString("base64url");
    const invitationExpiresAt = new Date(Date.now() + 7 * 86_400_000);
    const seller = await this.repository.profiles.create({
      ...input,
      email: input.email.toLowerCase(),
      referralCode: await this.uniqueCode(input.referralCode),
      status: "invited",
      invitedByUserId: actorUserId,
      invitationTokenHash: hash(token),
      invitationExpiresAt,
    });
    return {
      seller: serialize(seller.toObject()),
      invitationUrl: `${env.WEB_BASE_URL}/seller-invite/${token}`,
    };
  }

  async listSellers() {
    const sellers = await this.repository.profiles
      .find()
      .sort({ createdAt: -1 })
      .lean();
    return Promise.all(
      sellers.map(async (seller) => ({
        ...seller,
        clientCount: await this.repository.clients.countDocuments({
          sellerId: seller._id,
        }),
        availableCommission:
          (
            await this.repository.commissions.aggregate([
              { $match: { sellerId: seller._id, status: "available" } },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ])
          )[0]?.total ?? 0,
      })),
    );
  }

  async getSeller(sellerId: string) {
    if (!mongoose.isValidObjectId(sellerId))
      throw new AppError("SELLER_NOT_FOUND", 404, "Vendedor no encontrado");
    const seller = await this.repository.profiles.findById(sellerId).lean();
    if (!seller)
      throw new AppError("SELLER_NOT_FOUND", 404, "Vendedor no encontrado");
    const [clients, commissions, settlements] = await Promise.all([
      this.repository.clients
        .find({ sellerId })
        .populate("organizationId", "name status")
        .sort({ attributedAt: -1 })
        .lean(),
      this.repository.commissions
        .find({ sellerId })
        .populate("organizationId", "name")
        .sort({ createdAt: -1 })
        .lean(),
      this.repository.settlements
        .find({ sellerId })
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    return { seller, clients, commissions, settlements };
  }

  async updateSeller(sellerId: string, input: Record<string, unknown>) {
    const seller = await this.repository.profiles
      .findByIdAndUpdate(
        sellerId,
        { $set: input },
        { new: true, runValidators: true },
      )
      .lean();
    if (!seller)
      throw new AppError("SELLER_NOT_FOUND", 404, "Vendedor no encontrado");
    return seller;
  }

  async renewInvitation(sellerId: string) {
    const token = crypto.randomBytes(32).toString("base64url");
    const seller = await this.repository.profiles.findOneAndUpdate(
      { _id: sellerId, userId: null },
      {
        $set: {
          invitationTokenHash: hash(token),
          invitationExpiresAt: new Date(Date.now() + 7 * 86_400_000),
          status: "invited",
        },
      },
      { new: true },
    );
    if (!seller)
      throw new AppError(
        "INVITATION_UNAVAILABLE",
        409,
        "La invitación ya fue aceptada o no existe",
      );
    return {
      invitationUrl: `${env.WEB_BASE_URL}/seller-invite/${token}`,
      expiresAt: seller.invitationExpiresAt,
    };
  }

  async invitationDetails(token: string) {
    const seller = await this.repository.profiles
      .findOne({ invitationTokenHash: hash(token) })
      .select("+invitationTokenHash")
      .lean();
    if (
      !seller ||
      !seller.invitationExpiresAt ||
      seller.invitationExpiresAt <= new Date() ||
      seller.userId
    )
      throw new AppError(
        "INVALID_INVITATION",
        404,
        "La invitación no es válida o venció",
      );
    return {
      firstName: seller.firstName,
      lastName: seller.lastName,
      email: seller.email,
      expiresAt: seller.invitationExpiresAt,
    };
  }

  async acceptInvitation(token: string, userId: string) {
    const user = await UserModel.findById(userId).lean();
    if (!user)
      throw new AppError("USER_NOT_FOUND", 404, "Usuario no encontrado");
    const seller = await this.repository.profiles
      .findOne({ invitationTokenHash: hash(token) })
      .select("+invitationTokenHash");
    if (
      !seller ||
      !seller.invitationExpiresAt ||
      seller.invitationExpiresAt <= new Date() ||
      seller.userId
    )
      throw new AppError(
        "INVALID_INVITATION",
        409,
        "La invitación no es válida o venció",
      );
    if (user.email.toLowerCase() !== seller.email.toLowerCase())
      throw new AppError(
        "EMAIL_MISMATCH",
        403,
        "Debes ingresar con el correo que recibió la invitación",
      );
    seller.userId = user._id;
    seller.status = "active";
    seller.acceptedAt = new Date();
    seller.invitationTokenHash = null;
    seller.invitationExpiresAt = null;
    await seller.save();
    return { sellerId: seller.id, referralCode: seller.referralCode };
  }

  async dashboard(userId: string) {
    await this.repository.commissions.updateMany(
      { status: "held", availableAt: { $lte: new Date() } },
      { $set: { status: "available" } },
    );
    const seller = await this.repository.profiles
      .findOne({ userId, status: "active" })
      .lean();
    if (!seller)
      throw new AppError(
        "SELLER_ACCESS_REQUIRED",
        403,
        "No tienes un perfil de vendedor activo",
      );
    return this.getSeller(String(seller._id));
  }

  async attributeOrganization(organizationId: string, referralCode: string) {
    const seller = await this.repository.profiles.findOne({
      referralCode: referralCode.toUpperCase(),
      status: "active",
    });
    if (!seller)
      throw new AppError(
        "INVALID_REFERRAL_CODE",
        400,
        "Código de vendedor inválido",
      );
    if (!(await OrganizationModel.exists({ _id: organizationId })))
      throw new AppError(
        "ORGANIZATION_NOT_FOUND",
        404,
        "Organización no encontrada",
      );
    return this.repository.clients.findOneAndUpdate(
      { organizationId },
      {
        $setOnInsert: {
          sellerId: seller._id,
          referralCode: seller.referralCode,
          attributedAt: new Date(),
          status: "active",
        },
      },
      { upsert: true, new: true },
    );
  }

  async reconcileClientStatuses(): Promise<void> {
    const problematic = await OrganizationSubscriptionModel.find({
      status: { $in: ["past_due", "suspended", "canceled"] },
    }).distinct("organizationId");
    await this.repository.clients.updateMany(
      { organizationId: { $in: problematic } },
      { $set: { status: "lost", lostAt: new Date() } },
    );
  }

  async accrueCommission(input: {
    transactionId: string;
    organizationId: string;
    amount: number;
    currency: string;
  }): Promise<void> {
    const client = await this.repository.clients.findOne({
      organizationId: input.organizationId,
      status: "active",
    });
    if (!client) return;
    const seller = await this.repository.profiles.findOne({
      _id: client.sellerId,
      status: "active",
    });
    if (!seller) return;
    if (seller.commissionDurationMonths) {
      const endsAt = new Date(client.attributedAt);
      endsAt.setMonth(endsAt.getMonth() + seller.commissionDurationMonths);
      if (endsAt < new Date()) return;
    }
    const amount =
      seller.commissionType === "percentage"
        ? (input.amount * seller.commissionRate) / 100
        : seller.commissionRate;
    const availableAt = new Date(
      Date.now() + seller.commissionHoldDays * 86_400_000,
    );
    await this.repository.commissions.updateOne(
      { paymentTransactionId: input.transactionId },
      {
        $setOnInsert: {
          sellerId: seller._id,
          organizationId: input.organizationId,
          paymentTransactionId: input.transactionId,
          baseAmount: input.amount,
          amount,
          currency: input.currency,
          status: seller.commissionHoldDays ? "held" : "available",
          availableAt,
        },
      },
      { upsert: true },
    );
  }
}
