import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();
const mongoUri = process.env.MONGODB_URI ?? process.env.DATABASE_URL;
if (!mongoUri) throw new Error('MONGODB_URI or DATABASE_URL is required');

const defaults = {
  confirmation: 'appointment_confirmation',
  reminder: 'appointment_reminder',
  cancellation: 'appointment_cancellation',
  rescheduled: 'appointment_rescheduled',
  notice: 'appointment_notice',
  test: null
};

await mongoose.connect(mongoUri);
const db = mongoose.connection.db;
const existingGlobal = await db.collection('globalwhatsappsettings').findOne({ key: 'global' });
if (existingGlobal) {
  console.log('GlobalWhatsAppSettings already exists; no changes applied.');
  await mongoose.disconnect();
  process.exit(0);
}

const source = await db.collection('organizationwhatsappsettings').find({}).sort({ updatedAt: -1 }).limit(1).next();
const templates = source?.templates ?? {};
const global = {
  key: 'global',
  enabled: Boolean(source?.enabled ?? false),
  provider: 'meta_cloud_api',
  senderDisplayName: source?.senderDisplayName ?? 'NexMed',
  senderDisplayPhone: source?.senderDisplayPhone ?? source?.displayPhoneNumber ?? null,
  templateLanguage: 'es_AR',
  templates: {
    confirmation: templates.confirmation ?? templates.appointmentConfirmation ?? defaults.confirmation,
    reminder: templates.reminder ?? templates.appointmentReminder ?? defaults.reminder,
    cancellation: templates.cancellation ?? templates.appointmentCancellation ?? defaults.cancellation,
    rescheduled: templates.rescheduled ?? templates.appointmentRescheduled ?? defaults.rescheduled,
    notice: templates.notice ?? defaults.notice,
    test: templates.test ?? null
  },
  sendConfirmation: source?.sendConfirmation ?? true,
  sendReminder: source?.sendReminder ?? true,
  sendMidpointReminder: source?.sendMidpointReminder ?? true,
  sendSecondReminder: source?.sendSecondReminder ?? false,
  reminderHoursBefore: source?.reminderHoursBefore ?? 24,
  secondReminderHoursBefore: source?.secondReminderHoursBefore ?? 2,
  suspendedOrganizationIds: [],
  updatedByUserId: null,
  createdAt: new Date(),
  updatedAt: new Date()
};
await db.collection('globalwhatsappsettings').insertOne(global);
console.log(`Created GlobalWhatsAppSettings from ${source ? `OrganizationWhatsAppSettings ${source._id}` : 'defaults'}. Legacy per-organization settings were preserved for rollback/audit.`);
await mongoose.disconnect();
