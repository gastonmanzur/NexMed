import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../core/errors.js';
import { PatientService } from './patient.service.js';

const createService = (overrides: {
  patientIdentities?: Record<string, unknown>;
  patientProfiles?: Record<string, unknown>;
  organizationPatientProfiles?: Record<string, unknown>;
  appointmentsService?: Record<string, unknown>;
  organization?: Record<string, unknown>;
  expressSessions?: Record<string, unknown>;
  healthInsurances?: Record<string, unknown>;
} = {}) => {
  const organizationId = new mongoose.Types.ObjectId();
  const organization = { _id: organizationId, status: 'active', name: 'Centro Demo', displayName: 'Centro Demo', slug: 'centro-demo', type: 'clinic', ...overrides.organization };
  const identitiesByPhone = new Map<string, Record<string, unknown>>();
  const compatProfilesByPhone = new Map<string, Record<string, unknown>>();
  const orgProfilesByIdentity = new Map<string, Record<string, unknown>>();
  const orgProfilesByPhone = new Map<string, Record<string, unknown>>();

  const patientIdentities = {
    findById: vi.fn(async (id: string) => [...identitiesByPhone.values()].find((item) => String(item._id) === id) ?? null),
    findByNormalizedPhone: vi.fn(async (normalizedPhone: string) => identitiesByPhone.get(normalizedPhone) ?? null),
    create: vi.fn(async (input: Record<string, unknown>) => {
      const identity = { _id: new mongoose.Types.ObjectId(), ...input };
      identitiesByPhone.set(String(input.normalizedPhone), identity);
      return identity;
    }),
    updateById: vi.fn(async (id: string, update: Record<string, unknown>) => {
      const identity = [...identitiesByPhone.values()].find((item) => String(item._id) === id);
      if (!identity) return null;
      Object.assign(identity, update);
      return identity;
    }),
    ...overrides.patientIdentities
  };

  const patientProfiles = {
    findById: vi.fn(async (id: string) => [...compatProfilesByPhone.values()].find((item) => String(item._id) === id) ?? null),
    findByOrganizationAndNormalizedPhone: vi.fn(async (_organizationId: string, normalizedPhone: string) => compatProfilesByPhone.get(normalizedPhone) ?? null),
    updateById: vi.fn(async (id: string, update: Record<string, unknown>) => {
      const profile = [...compatProfilesByPhone.values()].find((item) => String(item._id) === id);
      if (!profile) return null;
      Object.assign(profile, update);
      return profile;
    }),
    create: vi.fn(async (input: Record<string, unknown>) => {
      const profile = { _id: new mongoose.Types.ObjectId(), ...input };
      compatProfilesByPhone.set(String(input.normalizedPhone), profile);
      return profile;
    }),
    ...overrides.patientProfiles
  };

  const organizationPatientProfiles = {
    findByOrganizationAndIdentity: vi.fn(async (_organizationId: string, patientIdentityId: string) => orgProfilesByIdentity.get(patientIdentityId) ?? null),
    findByOrganizationAndNormalizedPhone: vi.fn(async (_organizationId: string, normalizedPhone: string) => orgProfilesByPhone.get(normalizedPhone) ?? null),
    updateById: vi.fn(async (id: string, update: Record<string, unknown>) => {
      const profile = [...orgProfilesByIdentity.values()].find((item) => String(item._id) === id);
      if (!profile) return null;
      Object.assign(profile, update);
      return profile;
    }),
    create: vi.fn(async (input: Record<string, unknown>) => {
      const profile = { _id: new mongoose.Types.ObjectId(), ...input };
      orgProfilesByIdentity.set(String(input.patientIdentityId), profile);
      orgProfilesByPhone.set(String(input.normalizedPhone), profile);
      return profile;
    }),
    ...overrides.organizationPatientProfiles
  };

  const appointmentsService = {
    createExpressAppointment: vi.fn(async (_organizationId: string, input: Record<string, unknown>) => ({
      id: new mongoose.Types.ObjectId().toString(),
      organizationId: _organizationId,
      ...input
    })),
    ...overrides.appointmentsService
  };

  const healthInsurances = {
    findByIdInOrganization: vi.fn(),
    ...overrides.healthInsurances
  };

  const expressSessions = {
    create: vi.fn(async (input: Record<string, unknown>) => ({ _id: new mongoose.Types.ObjectId(), ...input })),
    findByTokenHash: vi.fn(async () => null),
    findValidByTokenHash: vi.fn(async () => null),
    touch: vi.fn(async () => undefined),
    ...overrides.expressSessions
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
    patientIdentities as never,
    organizationPatientProfiles as never,
    healthInsurances as never,
    expressSessions as never
  );

  return { service, organizationId: organizationId.toString(), patientIdentities, patientProfiles, organizationPatientProfiles, appointmentsService, expressSessions, healthInsurances, identitiesByPhone, compatProfilesByPhone, orgProfilesByIdentity };
};

const baseInput = (phone: string, startAt = '2026-07-01T14:00:00.000Z') => ({
  professionalId: new mongoose.Types.ObjectId().toString(),
  specialtyId: new mongoose.Types.ObjectId().toString(),
  startAt,
  patient: { firstName: 'Ana', lastName: 'Paz', phone },
  coverage: { type: 'private' as const }
});

describe('PatientService createExpressAppointment express identity/profile/appointment chain', () => {
  it('creates separate PatientIdentities and profiles for two different normalized phones without overwriting the first patient', async () => {
    const { service, organizationId, patientIdentities, patientProfiles, organizationPatientProfiles, appointmentsService, identitiesByPhone } = createService();

    await service.createExpressAppointment('centro-demo', baseInput('+54 11 1111-1111'));
    await service.createExpressAppointment('centro-demo', baseInput('+54 11 2222-2222', '2026-07-01T15:00:00.000Z'));

    expect(patientIdentities.findByNormalizedPhone).toHaveBeenNthCalledWith(1, '541111111111');
    expect(patientIdentities.findByNormalizedPhone).toHaveBeenNthCalledWith(2, '541122222222');
    expect(patientIdentities.create).toHaveBeenCalledTimes(2);
    expect(patientIdentities.updateById).not.toHaveBeenCalled();
    expect(identitiesByPhone.get('541111111111')).toEqual(expect.objectContaining({ normalizedPhone: '541111111111', firstName: 'Ana' }));
    expect(identitiesByPhone.get('541122222222')).toEqual(expect.objectContaining({ normalizedPhone: '541122222222', firstName: 'Ana' }));
    expect(patientProfiles.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ organizationId, userId: null, normalizedPhone: '541111111111' }));
    expect(patientProfiles.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ organizationId, userId: null, normalizedPhone: '541122222222' }));
    expect(organizationPatientProfiles.create).toHaveBeenCalledTimes(2);
    expect(appointmentsService.createExpressAppointment).toHaveBeenCalledTimes(2);
  });

  it('reuses PatientIdentity and PatientProfile for the same phone in the same organization and still creates another appointment', async () => {
    const { service, patientIdentities, patientProfiles, organizationPatientProfiles, appointmentsService } = createService();

    const firstAppointment = await service.createExpressAppointment('centro-demo', baseInput('+54 11 3333-3333'));
    const secondAppointment = await service.createExpressAppointment('centro-demo', baseInput('+54 11 3333-3333', '2026-07-01T16:00:00.000Z'));

    expect(patientIdentities.create).toHaveBeenCalledTimes(1);
    expect(patientIdentities.updateById).toHaveBeenCalledTimes(1);
    expect(patientProfiles.create).toHaveBeenCalledTimes(1);
    expect(patientProfiles.updateById).toHaveBeenCalledTimes(1);
    expect(organizationPatientProfiles.create).toHaveBeenCalledTimes(1);
    expect(organizationPatientProfiles.updateById).toHaveBeenCalledTimes(1);
    expect(appointmentsService.createExpressAppointment).toHaveBeenCalledTimes(2);
    expect(secondAppointment.patientProfileId).toBe(firstAppointment.patientProfileId);
  });

  it('recovers from a duplicate PatientIdentity race by re-reading the identity by normalizedPhone', async () => {
    const racedIdentity = { _id: new mongoose.Types.ObjectId(), normalizedPhone: '541144444444', firstName: 'Ana', lastName: 'Paz' };
    const duplicateKeyError = Object.assign(new Error('E11000 duplicate key error normalizedPhone_1_unique'), {
      code: 11000,
      keyPattern: { normalizedPhone: 1 },
      index: 'normalizedPhone_1_unique'
    });
    const findByNormalizedPhone = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(racedIdentity);
    const { service, patientIdentities, appointmentsService } = createService({
      patientIdentities: {
        findByNormalizedPhone,
        create: vi.fn().mockRejectedValue(duplicateKeyError)
      }
    });

    await expect(service.createExpressAppointment('centro-demo', baseInput('+54 11 4444-4444'))).resolves.toEqual(expect.objectContaining({ patientProfileId: expect.any(String) }));

    expect(patientIdentities.create).toHaveBeenCalledTimes(1);
    expect(findByNormalizedPhone).toHaveBeenCalledTimes(2);
    expect(appointmentsService.createExpressAppointment).toHaveBeenCalledTimes(1);
  });

  it('returns only masked data when looking up an existing phone', async () => {
    const { service } = createService();
    await service.createExpressAppointment('centro-demo', baseInput('+54 11 3333-6516'));

    const result = await service.lookupExpressPatient('centro-demo', { phone: '+54 11 3333-6516' });

    expect(result).toEqual({
      found: true,
      maskedPatient: { displayName: 'Ana P.', maskedPhone: '******6516' },
      requiresVerification: false,
      hasSavedData: true,
      lookupToken: expect.any(String)
    });
  });

  it('prefills safe saved patient data only after explicit acceptance', async () => {
    const healthInsuranceId = new mongoose.Types.ObjectId().toString();
    const { service } = createService({
      healthInsurances: {
        findByIdInOrganization: vi.fn(async () => ({ _id: healthInsuranceId, name: 'OSDE', status: 'active', requiresMemberNumber: false, requiresPlan: false }))
      }
    });

    await service.createExpressAppointment('centro-demo', {
      ...baseInput('+54 11 3333-6516'),
      patient: {
        firstName: 'Gaston',
        lastName: 'Manzur',
        phone: '+54 11 3333-6516',
        email: 'test2@example.com',
        documentNumber: '30609656',
        birthDate: '1983-12-14'
      },
      coverage: { type: 'health_insurance', healthInsuranceId, insuranceMemberNumber: '123456', insurancePlan: '210' }
    });

    const prefill = await service.prefillExpressPatient('centro-demo', { phone: '+54 11 3333-6516', acceptSavedData: true });

    expect(prefill).toEqual({
      found: true,
      patient: {
        firstName: 'Gaston',
        lastName: 'Manzur',
        phone: '+54 11 3333-6516',
        email: 'test2@example.com',
        documentNumber: '30609656',
        birthDate: '1983-12-14',
        coverage: {
          type: 'health_insurance',
          healthInsuranceId,
          healthInsuranceName: 'OSDE',
          insuranceMemberNumber: '123456',
          insurancePlan: '210'
        }
      }
    });
  });

  it('requires explicit saved data acceptance before returning prefill data', async () => {
    const { service } = createService();

    await expect(service.prefillExpressPatient('centro-demo', { phone: '+54 11 3333-6516', acceptSavedData: false as true })).rejects.toMatchObject({
      statusCode: 400,
      code: 'SAVED_DATA_ACCEPTANCE_REQUIRED'
    });
  });

  it('returns global identity data with private coverage when no organization profile exists', async () => {
    const { service } = createService();
    await service.createExpressAppointment('centro-demo', {
      ...baseInput('+54 11 3333-6516'),
      patient: { firstName: 'Gaston', lastName: 'Manzur', phone: '+54 11 3333-6516', email: 'test2@example.com', documentNumber: '30609656', birthDate: '1983-12-14' }
    });

    const otherOrganizationId = new mongoose.Types.ObjectId();
    (service as unknown as { organizations: { findBySlug: ReturnType<typeof vi.fn> } }).organizations.findBySlug.mockResolvedValueOnce({ _id: otherOrganizationId, status: 'active', name: 'Otro Centro', displayName: 'Otro Centro', slug: 'otro-centro', type: 'clinic' });

    await expect(service.prefillExpressPatient('otro-centro', { phone: '+54 11 3333-6516', acceptSavedData: true })).resolves.toEqual({
      found: true,
      patient: expect.objectContaining({
        firstName: 'Gaston',
        lastName: 'Manzur',
        email: 'test2@example.com',
        documentNumber: '30609656',
        birthDate: '1983-12-14',
        coverage: {
          type: 'private',
          healthInsuranceId: null,
          healthInsuranceName: null,
          insuranceMemberNumber: null,
          insurancePlan: null
        }
      })
    });
  });

  it('creates an appointment from a WhatsApp lookup token without requiring manual patient data', async () => {
    const { service, patientIdentities, appointmentsService } = createService();
    await service.createExpressAppointment('centro-demo', {
      ...baseInput('+54 11 3333-6516'),
      patient: { firstName: 'Gaston', lastName: 'Manzur', phone: '+54 11 3333-6516', email: 'gaston@example.com' }
    });

    const lookup = await service.lookupExpressPatient('centro-demo', { phone: '+54 11 3333-6516' });
    expect(lookup.found).toBe(true);
    patientIdentities.create.mockClear();

    const appointment = await service.createExpressAppointment('centro-demo', {
      professionalId: new mongoose.Types.ObjectId().toString(),
      specialtyId: new mongoose.Types.ObjectId().toString(),
      startAt: '2026-07-03T15:00:00.000Z',
      useSavedPatientData: true,
      patientLookupToken: lookup.found ? lookup.lookupToken : undefined
    });

    expect(patientIdentities.create).not.toHaveBeenCalled();
    expect(appointment.patientName).toBe('Gaston Manzur');
    expect(appointmentsService.createExpressAppointment).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({
      patientName: 'Gaston Manzur',
      patientEmail: 'gaston@example.com',
      paymentCoverageType: 'private',
      healthInsuranceName: 'Particular'
    }));
  });

  it('uses saved active health insurance coverage when booking with saved patient data', async () => {
    const healthInsuranceId = new mongoose.Types.ObjectId().toString();
    const { service, appointmentsService } = createService({
      healthInsurances: {
        findByIdInOrganization: vi.fn(async () => ({ _id: healthInsuranceId, name: 'OSDE', status: 'active', requiresMemberNumber: false, requiresPlan: false }))
      }
    });

    await service.createExpressAppointment('centro-demo', {
      ...baseInput('+54 11 3333-7777'),
      patient: { firstName: 'Gaston', lastName: 'Manzur', phone: '+54 11 3333-7777' },
      coverage: { type: 'health_insurance', healthInsuranceId, insuranceMemberNumber: '123456', insurancePlan: '210' }
    });
    const lookup = await service.lookupExpressPatient('centro-demo', { phone: '+54 11 3333-7777' });

    await service.createExpressAppointment('centro-demo', {
      professionalId: new mongoose.Types.ObjectId().toString(),
      specialtyId: new mongoose.Types.ObjectId().toString(),
      startAt: '2026-07-04T15:00:00.000Z',
      useSavedPatientData: true,
      patientLookupToken: lookup.found ? lookup.lookupToken : undefined
    });

    expect(appointmentsService.createExpressAppointment).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({
      paymentCoverageType: 'health_insurance',
      healthInsuranceId,
      healthInsuranceName: 'OSDE',
      insuranceMemberNumber: '123456',
      insurancePlan: '210'
    }));
  });

  it('creates an appointment with the current express patient without requiring personal data again', async () => {
    const { service, expressSessions, identitiesByPhone, patientIdentities, appointmentsService } = createService();
    await service.createExpressAppointment('centro-demo', baseInput('+54 11 4444-6516'));
    const identity = identitiesByPhone.get('541144446516');
    expect(identity).toBeTruthy();
    vi.mocked(expressSessions.findByTokenHash).mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId(), patientIdentityId: identity!._id, expiresAt: new Date(Date.now() + 60_000) } as never);
    patientIdentities.create.mockClear();

    const appointment = await service.createExpressAppointment('centro-demo', {
      professionalId: new mongoose.Types.ObjectId().toString(),
      specialtyId: new mongoose.Types.ObjectId().toString(),
      startAt: '2026-07-02T15:00:00.000Z',
      useCurrentExpressPatient: true,
      coverage: { type: 'private' }
    }, 'browser-token');

    expect(patientIdentities.create).not.toHaveBeenCalled();
    expect(appointment.patientName).toBe('Ana Paz');
    expect(appointmentsService.createExpressAppointment).toHaveBeenCalledTimes(2);
  });

  it('returns a 400 message when the selected slot is no longer available', async () => {
    const { service } = createService({
      appointmentsService: {
        createExpressAppointment: vi.fn().mockRejectedValue(new AppError('SLOT_NOT_AVAILABLE', 409, 'Requested slot is not available'))
      }
    });

    await expect(service.createExpressAppointment('centro-demo', baseInput('+54 11 5555-5555'))).rejects.toMatchObject({
      statusCode: 400,
      message: 'El horario seleccionado ya no está disponible.'
    });
  });
});
