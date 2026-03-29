import { AppointmentModel, type AppointmentDocument } from '../models/appointment.model.js';

type AppointmentStatus = AppointmentDocument['status'];

interface CreateAppointmentInput {
  organizationId: string;
  professionalId: string;
  specialtyId?: string | null;
  patientProfileId?: string | null;
  patientName: string;
  patientEmail?: string | null;
  patientPhone?: string | null;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  source: AppointmentDocument['source'];
  notes?: string | null;
  createdByUserId: string;
  rescheduledFromAppointmentId?: string | null;
}

interface ListAppointmentFilters {
  professionalId?: string;
  status?: AppointmentStatus;
  from?: Date;
  to?: Date;
}

interface ListPatientAppointmentsFilters {
  patientProfileId: string;
  status?: AppointmentStatus;
  organizationId?: string;
}

export class AppointmentRepository {
  async create(input: CreateAppointmentInput): Promise<AppointmentDocument> {
    return AppointmentModel.create(input);
  }

  async findByIdInOrganization(organizationId: string, appointmentId: string): Promise<AppointmentDocument | null> {
    return AppointmentModel.findOne({ _id: appointmentId, organizationId }).exec();
  }

  async listByOrganization(organizationId: string, filters: ListAppointmentFilters): Promise<AppointmentDocument[]> {
    const query: Record<string, unknown> = { organizationId };

    if (filters.professionalId) {
      query.professionalId = filters.professionalId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.from || filters.to) {
      query.startAt = {
        ...(filters.from ? { $gte: filters.from } : {}),
        ...(filters.to ? { $lte: filters.to } : {})
      };
    }

    return AppointmentModel.find(query).sort({ startAt: -1, createdAt: -1 }).exec();
  }

  async listByPatientProfile(filters: ListPatientAppointmentsFilters): Promise<AppointmentDocument[]> {
    const query: Record<string, unknown> = {
      patientProfileId: filters.patientProfileId
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.organizationId) {
      query.organizationId = filters.organizationId;
    }

    return AppointmentModel.find(query).sort({ startAt: 1, createdAt: -1 }).exec();
  }

  async findByIdForPatient(appointmentId: string, patientProfileId: string): Promise<AppointmentDocument | null> {
    return AppointmentModel.findOne({ _id: appointmentId, patientProfileId }).exec();
  }

  async updateByIdInOrganization(
    organizationId: string,
    appointmentId: string,
    update: Record<string, unknown>
  ): Promise<AppointmentDocument | null> {
    return AppointmentModel.findOneAndUpdate({ _id: appointmentId, organizationId }, { $set: update }, { new: true }).exec();
  }

  async findBookedOverlappingRange(
    organizationId: string,
    professionalId: string,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string
  ): Promise<AppointmentDocument[]> {
    const query: Record<string, unknown> = {
      organizationId,
      professionalId,
      status: 'booked',
      startAt: { $lt: endAt },
      endAt: { $gt: startAt }
    };

    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId };
    }

    return AppointmentModel.find(query).exec();
  }

  async findBookedByProfessionalAndRange(
    organizationId: string,
    professionalId: string,
    from: Date,
    to: Date
  ): Promise<AppointmentDocument[]> {
    return AppointmentModel.find({
      organizationId,
      professionalId,
      status: 'booked',
      startAt: { $lt: to },
      endAt: { $gt: from }
    }).exec();
  }

  async findBookedStartingBetween(from: Date, to: Date): Promise<AppointmentDocument[]> {
    return AppointmentModel.find({
      status: 'booked',
      startAt: { $gte: from, $lte: to }
    }).exec();
  }

}
