import 'dotenv/config';
import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI is required. Example: MONGO_URI="mongodb://..." node apps/api/scripts/migrate-internal-admin-subscriptions.mjs');
  process.exit(1);
}

await mongoose.connect(mongoUri, { autoIndex: false });

try {
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const organizations = db.collection('organizations');
  const subscriptions = db.collection('organizationsubscriptions');

  const internalUsers = await users.find({ $or: [{ globalRole: 'super_admin' }, { role: 'admin' }] }, { projection: { _id: 1, email: 1 } }).toArray();
  const internalUserIds = internalUsers.map((user) => user._id);
  const internalOrganizations = internalUserIds.length > 0
    ? await organizations.find({ createdByUserId: { $in: internalUserIds } }, { projection: { _id: 1, name: 1, displayName: 1 } }).toArray()
    : [];
  const internalOrganizationIds = internalOrganizations.map((organization) => organization._id);

  const affected = [];
  const providerActionRequired = [];

  for (const subscription of await subscriptions.find({ organizationId: { $in: internalOrganizationIds } }).toArray()) {
    if (subscription.provider === 'mercadopago' && subscription.providerReference) {
      providerActionRequired.push({
        subscriptionId: subscription._id.toString(),
        organizationId: subscription.organizationId.toString(),
        providerReference: subscription.providerReference
      });
      continue;
    }

    await subscriptions.updateOne(
      { _id: subscription._id },
      {
        $set: {
          billingMode: 'not_applicable',
          billingExemptionReason: 'internal_admin',
          billingExemptAt: subscription.billingExemptAt ?? new Date(),
          provider: 'internal',
          autoRenew: false,
          finalAmount: 0,
          discountAmount: 0,
          discountValue: 0,
          updatedAt: new Date()
        },
        $unset: {
          providerReference: '',
          expiresAt: ''
        }
      }
    );
    affected.push({ subscriptionId: subscription._id.toString(), organizationId: subscription.organizationId.toString() });
  }

  console.log(JSON.stringify({
    internalUsers: internalUsers.length,
    internalOrganizations: internalOrganizations.length,
    updatedSubscriptions: affected,
    providerActionRequired
  }, null, 2));

  if (providerActionRequired.length > 0) {
    console.warn('Some internal admin subscriptions have active Mercado Pago references. Cancel them in Mercado Pago before rerunning this migration.');
  }
} finally {
  await mongoose.disconnect();
}
