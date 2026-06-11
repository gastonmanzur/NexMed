import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { PatientService } from './patient.service.js';

const createService = (overrides: {
  patientProfiles?: Record<string, unknown>;
  organizationPatientProfiles?: Record<string, unknown>;
} = {}) => {
  const organizationId = new mongoose.Types.ObjectId();
  const organization = { _id: organizationId, status: 'active', name: 'Centro Demo', displayName: 'Centro Demo', slug: 'centro-demo', type: 'clinic' };
  const createdProfiles: unknown[] = [];

  const patientProfiles = {
    findById: vi.fn(),
    findByOrganizationAndNormalizedPhone: vi.fn().mockResolvedValue(null),
    updateById: vi.fn(),
    create: vi.fn(async (input: Record<string, unknown>) => {
      const profile = { _id: new mongoose.Types.ObjectId(), ...input };
      createdProfiles.push(profile);
      return profile;
    }),
    ...overrides.patientProfiles
  };

  const organizationPatientProfiles = {
    findByOrganizationAndIdentity: vi.fn().mockResolvedValue(null),
    findByOrganizationAndNormalizedPhone: vi.fn().mockResolvedValue(null),
    upsertByOrganizationAndIdentity: vi.fn(async (input: Record<string, unknown>) => ({ _id: new mongoose.Types.ObjectId(), ...input })),
    ...overrides.organizationPatientProfiles
  };

  const appointmentsService = {
    createExpressAppointment: vi.fn(async (_organizationId: string, input: Record<string, unknown>) => ({
      id: new mongoose.Types.ObjectId().toString(),
      organizationId: _organizationId,
      ...input
    }))
  };

  const service = new PatientService(
    {} as never,
    { findById: vi.fn(), findBySlug: vi.fn().mockResolvedValue(organization) } as never,
    {} as never,
    { findByToken: vi.fn() } as never,
    patientProfiles as never,
    { upsertActive: vi.fn(async (input: Record<string, unknown>) => ({ _id: new mongoose.Types.ObjectId(), ...input })) } as never,
    appointmentsService as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { upsertByNormalizedPhone: vi.fn(async (input: Record<string, unknown>) => ({ _id: new mongoose.Types.ObjectId(), ...input })) } as never,
    organizationPatientProfiles as never,
    { findByIdInOrganization: vi.fn() } as never
  );

  return { service, organizationId: organizationId.toString(), patientProfiles, organizationPatientProfiles, appointmentsService, createdProfiles };
};

const baseInput = (phone: string) => ({
  professionalId: new mongoose.Types.ObjectId().toString(),
  specialtyId: new mongoose.Types.ObjectId().toString(),
  startAt: '2026-07-01T14:00:00.000Z',
  patient: { firstName: 'Ana', lastName: 'Paz', phone },
  coverage: { type: 'private' as const }
});

describe('PatientService createExpressAppointment patient profile reuse', () => {
  it('creates different express PatientProfiles with userId null for different phones in the same organization', async () => {
    const { service, organizationId, patientProfiles, appointmentsService } = createService();

    await service.createExpressAppointment('centro-demo', baseInput('+54 11 1111-1111'));
    await service.createExpressAppointment('centro-demo', baseInput('+54 11 2222-2222'));

    expect(patientProfiles.create).toHaveBeenCalledTimes(2);
    expect(patientProfiles.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ organizationId, userId: null, normalizedPhone: '541111111111' }));
    expect(patientProfiles.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ organizationId, userId: null, normalizedPhone: '541122222222' }));
    expect(appointmentsService.createExpressAppointment).toHaveBeenCalledTimes(2);
  });

  it('reuses the existing express PatientProfile for the same organization and normalized phone', async () => {
    const existingProfile = { _id: new mongoose.Types.ObjectId(), organizationId: new mongoose.Types.ObjectId(), userId: null, normalizedPhone: '541133333333' };
    const { service, patientProfiles, appointmentsService } = createService({
      patientProfiles: {
        findByOrganizationAndNormalizedPhone: vi.fn().mockResolvedValue(existingProfile),
        updateById: vi.fn().mockResolvedValue({ ...existingProfile, firstName: 'Ana', lastName: 'Paz' })
      }
    });

    await service.createExpressAppointment('centro-demo', baseInput('+54 11 3333-3333'));
    await service.createExpressAppointment('centro-demo', baseInput('+54 11 3333-3333'));

    expect(patientProfiles.create).not.toHaveBeenCalled();
    expect(patientProfiles.updateById).toHaveBeenCalledTimes(2);
    expect(appointmentsService.createExpressAppointment).toHaveBeenCalledTimes(2);
    expect(appointmentsService.createExpressAppointment).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ patientProfileId: existingProfile._id.toString() }));
  });

  it('recovers from a duplicate organization + normalizedPhone race by re-reading and reusing the existing profile', async () => {
    const racedProfile = { _id: new mongoose.Types.ObjectId(), userId: null, normalizedPhone: '541144444444' };
    const duplicateKeyError = Object.assign(new Error('E11000 duplicate key error organizationId_1_normalizedPhone_1_partial_unique'), {
      code: 11000,
      keyPattern: { organizationId: 1, normalizedPhone: 1 },
      index: 'organizationId_1_normalizedPhone_1_partial_unique'
    });
    const findByOrganizationAndNormalizedPhone = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(racedProfile);
    const { service, patientProfiles, appointmentsService } = createService({
      patientProfiles: {
        findByOrganizationAndNormalizedPhone,
        create: vi.fn().mockRejectedValue(duplicateKeyError),
        updateById: vi.fn().mockResolvedValue({ ...racedProfile, firstName: 'Ana', lastName: 'Paz' })
      }
    });

    await expect(service.createExpressAppointment('centro-demo', baseInput('+54 11 4444-4444'))).resolves.toEqual(expect.objectContaining({ patientProfileId: racedProfile._id.toString() }));

    expect(patientProfiles.create).toHaveBeenCalledTimes(1);
    expect(findByOrganizationAndNormalizedPhone).toHaveBeenCalledTimes(2);
    expect(appointmentsService.createExpressAppointment).toHaveBeenCalledTimes(1);
  });
});
