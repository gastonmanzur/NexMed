import { AppError } from '../../../core/errors.js';
import { AppointmentModel } from '../../appointments/models/appointment.model.js';
import { PatientProfileModel } from '../../patient/models/patient-profile.model.js';
import { ProfessionalModel } from '../../professionals/models/professional.model.js';
import { ClinicalAuditLogModel } from '../models/clinical-audit-log.model.js';
import { ClinicalEncounterModel } from '../models/clinical-encounter.model.js';
import { ClinicalRecordModel } from '../models/clinical-record.model.js';
import { InternalMessageModel } from '../models/internal-message.model.js';

const arr = (v?: string[] | string): string[] => Array.isArray(v) ? v.map((x) => x.trim()).filter(Boolean) : typeof v === 'string' ? v.split('\n').map((x) => x.trim()).filter(Boolean) : [];
const id = (v: unknown): string | null => v && typeof (v as { toString: () => string }).toString === 'function' ? (v as { toString: () => string }).toString() : null;

export class ClinicalService {
  private async ensureAppointment(organizationId: string, professionalId: string, appointmentId: string) {
    const appointment = await AppointmentModel.findOne({ _id: appointmentId, organizationId, professionalId }).exec();
    if (!appointment) throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Appointment not found');
    if (!appointment.patientProfileId) throw new AppError('PATIENT_PROFILE_REQUIRED', 409, 'Appointment has no patient profile');
    return appointment;
  }

  private async ensurePatientAllowed(organizationId: string, professionalId: string, patientProfileId: string) {
    const exists = await AppointmentModel.exists({ organizationId, professionalId, patientProfileId });
    if (!exists) throw new AppError('FORBIDDEN', 403, 'Patient is not assigned to this professional');
  }

  private async audit(input: { organizationId: string; userId: string; professionalId?: string; patientProfileId: string; action: string; resourceType: string; resourceId?: string; ip?: string; userAgent?: string }) {
    await ClinicalAuditLogModel.create(input).catch(() => undefined);
  }

  async attention(organizationId: string, professionalId: string, appointmentId: string, userId: string, meta: { ip?: string; userAgent?: string }) {
    const appointment = await this.ensureAppointment(organizationId, professionalId, appointmentId);
    const [patient, professional, record, currentEncounter, previous] = await Promise.all([
      PatientProfileModel.findById(appointment.patientProfileId).exec(),
      ProfessionalModel.findById(professionalId).exec(),
      ClinicalRecordModel.findOneAndUpdate({ organizationId, patientProfileId: appointment.patientProfileId }, { $setOnInsert: { organizationId, patientProfileId: appointment.patientProfileId } }, { new: true, upsert: true }).exec(),
      ClinicalEncounterModel.findOne({ organizationId, appointmentId }).exec(),
      ClinicalEncounterModel.find({ organizationId, patientProfileId: appointment.patientProfileId, appointmentId: { $ne: appointment._id }, status: { $ne: 'cancelled' } }).sort({ createdAt: -1 }).limit(20).exec()
    ]);
    await this.audit({ organizationId, userId, professionalId, patientProfileId: appointment.patientProfileId!.toString(), action: 'clinical_record_view', resourceType: 'ClinicalRecord', resourceId: record._id.toString(), ...meta });
    return { appointment, patient, professional, clinicalRecord: record, currentEncounter, previousEncounters: previous };
  }

  async getRecord(organizationId: string, professionalId: string, patientProfileId: string, userId: string, meta: { ip?: string; userAgent?: string }) {
    await this.ensurePatientAllowed(organizationId, professionalId, patientProfileId);
    const record = await ClinicalRecordModel.findOneAndUpdate({ organizationId, patientProfileId }, { $setOnInsert: { organizationId, patientProfileId } }, { new: true, upsert: true }).exec();
    await this.audit({ organizationId, userId, professionalId, patientProfileId, action: 'clinical_record_view', resourceType: 'ClinicalRecord', resourceId: record._id.toString(), ...meta });
    return record;
  }

  async updateRecord(organizationId: string, professionalId: string, patientProfileId: string, userId: string, body: Record<string, unknown>, meta: { ip?: string; userAgent?: string }) {
    await this.ensurePatientAllowed(organizationId, professionalId, patientProfileId);
    const record = await ClinicalRecordModel.findOneAndUpdate({ organizationId, patientProfileId }, { $set: { allergies: arr(body.allergies as any), chronicConditions: arr(body.chronicConditions as any), currentMedications: arr(body.currentMedications as any), relevantHistory: body.relevantHistory ?? '', generalObservations: body.generalObservations ?? '' } }, { new: true, upsert: true }).exec();
    await this.audit({ organizationId, userId, professionalId, patientProfileId, action: 'clinical_record_update', resourceType: 'ClinicalRecord', resourceId: record._id.toString(), ...meta });
    return record;
  }

  async encounters(organizationId: string, professionalId: string, patientProfileId: string, userId: string, meta: { ip?: string; userAgent?: string }) {
    await this.ensurePatientAllowed(organizationId, professionalId, patientProfileId);
    const rows = await ClinicalEncounterModel.find({ organizationId, patientProfileId, status: { $ne: 'cancelled' } }).sort({ createdAt: -1 }).exec();
    if (rows[0]) await this.audit({ organizationId, userId, professionalId, patientProfileId, action: 'encounter_view', resourceType: 'ClinicalEncounter', resourceId: rows[0]._id.toString(), ...meta });
    return rows;
  }

  async saveEncounter(organizationId: string, professionalId: string, appointmentId: string, userId: string, body: Record<string, unknown>, meta: { ip?: string; userAgent?: string }) {
    const appointment = await this.ensureAppointment(organizationId, professionalId, appointmentId);
    await ClinicalRecordModel.findOneAndUpdate({ organizationId, patientProfileId: appointment.patientProfileId }, { $setOnInsert: { organizationId, patientProfileId: appointment.patientProfileId } }, { upsert: true }).exec();
    const existing = await ClinicalEncounterModel.findOne({ organizationId, appointmentId }).exec();
    if (existing?.status === 'signed') throw new AppError('ENCOUNTER_SIGNED', 409, 'Signed encounter cannot be edited');
    const update = { reason: body.reason ?? '', evolution: body.evolution ?? '', diagnosisText: body.diagnosisText ?? '', treatmentPlan: body.treatmentPlan ?? '', observations: body.observations ?? '' };
    const encounter = await ClinicalEncounterModel.findOneAndUpdate({ organizationId, appointmentId }, { $set: update, $setOnInsert: { organizationId, appointmentId, patientProfileId: appointment.patientProfileId, professionalId, professionalUserId: userId, status: 'draft' } }, { new: true, upsert: true }).exec();
    await this.audit({ organizationId, userId, professionalId, patientProfileId: appointment.patientProfileId!.toString(), action: existing ? 'encounter_update' : 'encounter_create', resourceType: 'ClinicalEncounter', resourceId: encounter._id.toString(), ...meta });
    return encounter;
  }

  async patchEncounter(organizationId: string, professionalId: string, encounterId: string, userId: string, body: Record<string, unknown>, meta: { ip?: string; userAgent?: string }) {
    const existing = await ClinicalEncounterModel.findOne({ _id: encounterId, organizationId, professionalId }).exec();
    if (!existing) throw new AppError('ENCOUNTER_NOT_FOUND', 404, 'Encounter not found');
    if (existing.status === 'signed') throw new AppError('ENCOUNTER_SIGNED', 409, 'Signed encounter cannot be edited');
    const encounter = await ClinicalEncounterModel.findByIdAndUpdate(encounterId, { $set: { reason: body.reason ?? existing.reason, evolution: body.evolution ?? existing.evolution, diagnosisText: body.diagnosisText ?? existing.diagnosisText, treatmentPlan: body.treatmentPlan ?? existing.treatmentPlan, observations: body.observations ?? existing.observations } }, { new: true }).exec();
    await this.audit({ organizationId, userId, professionalId, patientProfileId: existing.patientProfileId.toString(), action: 'encounter_update', resourceType: 'ClinicalEncounter', resourceId: encounterId, ...meta });
    return encounter;
  }

  async signEncounter(organizationId: string, professionalId: string, encounterId: string, userId: string, meta: { ip?: string; userAgent?: string }) {
    const existing = await ClinicalEncounterModel.findOne({ _id: encounterId, organizationId, professionalId }).exec();
    if (!existing) throw new AppError('ENCOUNTER_NOT_FOUND', 404, 'Encounter not found');
    if (!`${existing.reason ?? ''}${existing.evolution ?? ''}`.trim()) throw new AppError('EMPTY_ENCOUNTER', 400, 'Motivo o evolución son obligatorios para firmar');
    const encounter = await ClinicalEncounterModel.findByIdAndUpdate(encounterId, { $set: { status: 'signed', signedAt: new Date() } }, { new: true }).exec();
    await this.audit({ organizationId, userId, professionalId, patientProfileId: existing.patientProfileId.toString(), action: 'encounter_sign', resourceType: 'ClinicalEncounter', resourceId: encounterId, ...meta });
    return encounter;
  }

  async listMessages(organizationId: string, userId: string, role: 'professional' | 'secretary') {
    const q = role === 'professional' ? { organizationId, $or: [{ toUserId: userId }, { toRole: 'professional' }] } : { organizationId, toRole: 'secretary' };
    return InternalMessageModel.find(q).sort({ createdAt: -1 }).limit(50).exec();
  }

  async createProfessionalMessage(organizationId: string, professionalId: string, appointmentId: string | undefined, userId: string, body: Record<string, unknown>) {
    const message = String(body.message ?? '').trim();
    if (!message) throw new AppError('MESSAGE_REQUIRED', 400, 'Message is required');
    let patientProfileId = body.patientProfileId as string | undefined;
    if (appointmentId) patientProfileId = id((await this.ensureAppointment(organizationId, professionalId, appointmentId)).patientProfileId) ?? undefined;
    return InternalMessageModel.create({ organizationId, appointmentId: appointmentId ?? null, patientProfileId: patientProfileId ?? null, fromUserId: userId, toRole: 'secretary', type: body.type ?? 'custom', message });
  }

  async createSecretaryMessage(organizationId: string, appointmentId: string, userId: string, body: Record<string, unknown>) {
    const appointment = await AppointmentModel.findOne({ _id: appointmentId, organizationId }).exec();
    if (!appointment) throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Appointment not found');
    const professional = await ProfessionalModel.findById(appointment.professionalId).exec();
    const message = String(body.message ?? '').trim();
    if (!message) throw new AppError('MESSAGE_REQUIRED', 400, 'Message is required');
    return InternalMessageModel.create({ organizationId, appointmentId, patientProfileId: appointment.patientProfileId ?? null, fromUserId: userId, toUserId: professional?.accessUserId ?? professional?.userId ?? null, toRole: 'professional', type: body.type ?? 'custom', message });
  }

  async markMessage(organizationId: string, messageId: string, status: 'read' | 'resolved') {
    const set = status === 'read' ? { status, readAt: new Date() } : { status, resolvedAt: new Date() };
    const msg = await InternalMessageModel.findOneAndUpdate({ _id: messageId, organizationId }, { $set: set }, { new: true }).exec();
    if (!msg) throw new AppError('MESSAGE_NOT_FOUND', 404, 'Message not found');
    return msg;
  }
}
