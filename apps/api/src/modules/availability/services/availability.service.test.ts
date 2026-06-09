import mongoose from 'mongoose';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { AvailabilityService } from './availability.service.js';

const organizationId = new mongoose.Types.ObjectId().toString();
const professionalId = new mongoose.Types.ObjectId().toString();

const objectId = () => new mongoose.Types.ObjectId();

const makeProfessional = (overrides: Record<string, unknown> = {}) => ({
  _id: new mongoose.Types.ObjectId(professionalId),
  organizationId: new mongoose.Types.ObjectId(organizationId),
  firstName: 'Martín',
  lastName: 'Pérez',
  displayName: 'Dr. Martín',
  status: 'active',
  availabilityReleaseMode: 'progressive',
  availabilityReleaseLimit: 3,
  ...overrides
});

const makeRule = (weekday: number, overrides: Record<string, unknown> = {}) => ({
  _id: objectId(),
  organizationId: new mongoose.Types.ObjectId(organizationId),
  professionalId: new mongoose.Types.ObjectId(professionalId),
  weekday,
  startTime: '08:00',
  endTime: '13:00',
  appointmentDurationMinutes: 30,
  bufferMinutes: 0,
  status: 'active',
  createdAt: new Date('2029-01-01T00:00:00.000Z'),
  updatedAt: new Date('2029-01-01T00:00:00.000Z'),
  ...overrides
});

const makeAppointment = (date: string, startTime: string, endTime: string) => ({
  _id: objectId(),
  organizationId: new mongoose.Types.ObjectId(organizationId),
  professionalId: new mongoose.Types.ObjectId(professionalId),
  startAt: new Date(`${date}T${startTime}:00.000Z`),
  endAt: new Date(`${date}T${endTime}:00.000Z`),
  status: 'booked'
});

const buildService = ({
  professional = makeProfessional(),
  rules = [makeRule(1)],
  exceptions = [],
  appointments = []
}: {
  professional?: Record<string, unknown>;
  rules?: Array<Record<string, unknown>>;
  exceptions?: Array<Record<string, unknown>>;
  appointments?: Array<Record<string, unknown>>;
} = {}) => {
  const professionals = {
    findByIdInOrganization: vi.fn().mockResolvedValue(professional)
  };
  const specialties = {
    findByIdInOrganization: vi.fn()
  };
  const professionalSpecialties = {
    existsForProfessionalAndSpecialty: vi.fn()
  };
  const organizationSettings = {
    findByOrganizationId: vi.fn().mockResolvedValue({ timezone: 'America/Argentina/Buenos_Aires' })
  };
  const availabilityRules = {
    findActiveByProfessional: vi.fn().mockResolvedValue(rules)
  };
  const availabilityExceptions = {
    findActiveByProfessionalAndDateRange: vi.fn().mockResolvedValue(exceptions)
  };
  const appointmentRepository = {
    findBookedByProfessionalAndRange: vi.fn().mockResolvedValue(appointments)
  };

  return {
    service: new AvailabilityService(
      availabilityRules as never,
      availabilityExceptions as never,
      professionals as never,
      organizationSettings as never,
      appointmentRepository as never,
      specialties as never,
      professionalSpecialties as never
    ),
    professionals,
    availabilityRules,
    appointmentRepository
  };
};

const slotState = (slots: Array<{ startTime: string; available: boolean; blockedReason?: string }>) =>
  slots.map((slot) => `${slot.startTime}:${slot.available ? 'enabled' : slot.blockedReason ?? 'blocked'}`);

const availableTimes = (slots: Array<{ startTime: string; available: boolean }>) =>
  slots.filter((slot) => slot.available).map((slot) => slot.startTime);

const progressiveBlockedTimes = (slots: Array<{ startTime: string; blockedReason?: string }>) =>
  slots.filter((slot) => slot.blockedReason === 'progressive_release').map((slot) => slot.startTime);

const occupiedTimes = (slots: Array<{ startTime: string; blockedReason?: string }>) =>
  slots.filter((slot) => slot.blockedReason === 'occupied').map((slot) => slot.startTime);

describe('AvailabilityService progressive release', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('habilita solo la primera tanda fija y bloquea las tandas posteriores por agenda progresiva', async () => {
    vi.setSystemTime(new Date('2029-12-31T00:00:00.000Z'));
    const { service } = buildService();

    const availability = await service.getCalculatedAvailability(organizationId, professionalId, {
      startDate: '2030-01-07',
      endDate: '2030-01-07'
    });

    expect(slotState(availability.days[0]!.slots)).toEqual([
      '08:00:enabled',
      '08:30:enabled',
      '09:00:enabled',
      '09:30:progressive_release',
      '10:00:progressive_release',
      '10:30:progressive_release',
      '11:00:progressive_release',
      '11:30:progressive_release',
      '12:00:progressive_release',
      '12:30:progressive_release'
    ]);
    expect(availableTimes(availability.days[0]!.slots)).toEqual(['08:00', '08:30', '09:00']);
    expect(progressiveBlockedTimes(availability.days[0]!.slots)).toHaveLength(7);
  });

  it('mantiene las tandas fijas cuando solo hay un turno reservado en la primera tanda', async () => {
    vi.setSystemTime(new Date('2029-12-31T00:00:00.000Z'));
    const { service } = buildService({
      appointments: [makeAppointment('2030-01-07', '11:00', '11:30')]
    });

    const availability = await service.getCalculatedAvailability(organizationId, professionalId, {
      startDate: '2030-01-07',
      endDate: '2030-01-07'
    });

    expect(occupiedTimes(availability.days[0]!.slots)).toEqual(['08:00']);
    expect(availableTimes(availability.days[0]!.slots)).toEqual(['08:30', '09:00']);
    expect(availability.days[0]!.slots.find((slot) => slot.startTime === '09:30')?.blockedReason).toBe('progressive_release');
  });

  it('habilita la segunda tanda cuando la primera tanda fija está completa y vuelve a la primera si se cancela un turno anterior', async () => {
    vi.setSystemTime(new Date('2029-12-31T00:00:00.000Z'));
    const bookedFirstThree = [
      makeAppointment('2030-01-07', '11:00', '11:30'),
      makeAppointment('2030-01-07', '11:30', '12:00'),
      makeAppointment('2030-01-07', '12:00', '12:30')
    ];
    const { service: serviceWithBookings } = buildService({
      appointments: bookedFirstThree
    });

    const afterBookings = await serviceWithBookings.getCalculatedAvailability(organizationId, professionalId, {
      startDate: '2030-01-07',
      endDate: '2030-01-07'
    });

    expect(occupiedTimes(afterBookings.days[0]!.slots)).toEqual(['08:00', '08:30', '09:00']);
    expect(availableTimes(afterBookings.days[0]!.slots)).toEqual(['09:30', '10:00', '10:30']);
    expect(progressiveBlockedTimes(afterBookings.days[0]!.slots)).toEqual(['11:00', '11:30', '12:00', '12:30']);

    const afterCancellationBookings = [makeAppointment('2030-01-07', '11:00', '11:30'), makeAppointment('2030-01-07', '12:00', '12:30')];
    const { service: serviceAfterCancellation } = buildService({
      appointments: afterCancellationBookings
    });

    const afterCancellation = await serviceAfterCancellation.getCalculatedAvailability(organizationId, professionalId, {
      startDate: '2030-01-07',
      endDate: '2030-01-07'
    });

    expect(occupiedTimes(afterCancellation.days[0]!.slots)).toEqual(['08:00', '09:00']);
    expect(availableTimes(afterCancellation.days[0]!.slots)).toEqual(['08:30']);
    expect(progressiveBlockedTimes(afterCancellation.days[0]!.slots)).toEqual(['09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30']);
  });

  it('calcula el límite progresivo de manera independiente para cada día del rango', async () => {
    vi.setSystemTime(new Date('2029-12-31T00:00:00.000Z'));
    const { service } = buildService({
      rules: [makeRule(1), makeRule(2), makeRule(3)]
    });

    const availability = await service.getCalculatedAvailability(organizationId, professionalId, {
      startDate: '2030-01-07',
      endDate: '2030-01-09'
    });

    expect(availability.days).toHaveLength(3);
    for (const day of availability.days) {
      expect(slotState(day.slots).slice(0, 4)).toEqual(['08:00:enabled', '08:30:enabled', '09:00:enabled', '09:30:progressive_release']);
    }
  });

  it('respeta el modo y límite de cada profesional consultado', async () => {
    vi.setSystemTime(new Date('2029-12-31T00:00:00.000Z'));
    const { service: freeService } = buildService({
      professional: makeProfessional({
        availabilityReleaseMode: 'free',
        availabilityReleaseLimit: null
      })
    });
    const { service: limitFiveService } = buildService({
      professional: makeProfessional({
        availabilityReleaseMode: 'progressive',
        availabilityReleaseLimit: 5
      })
    });

    const freeAvailability = await freeService.getCalculatedAvailability(organizationId, professionalId, {
      startDate: '2030-01-07',
      endDate: '2030-01-07'
    });
    const limitFiveAvailability = await limitFiveService.getCalculatedAvailability(organizationId, professionalId, {
      startDate: '2030-01-07',
      endDate: '2030-01-07'
    });

    expect(freeAvailability.days[0]!.slots.every((slot) => slot.available)).toBe(true);
    expect(slotState(limitFiveAvailability.days[0]!.slots).slice(0, 6)).toEqual([
      '08:00:enabled',
      '08:30:enabled',
      '09:00:enabled',
      '09:30:enabled',
      '10:00:enabled',
      '10:30:progressive_release'
    ]);
  });

  it('no cuenta horarios vencidos de hoy como primeros N slots habilitados', async () => {
    vi.setSystemTime(new Date('2030-01-07T15:22:00.000Z'));
    const { service } = buildService({
      rules: [makeRule(1, { startTime: '08:00', endTime: '17:00' })]
    });

    const availability = await service.getCalculatedAvailability(organizationId, professionalId, {
      startDate: '2030-01-07',
      endDate: '2030-01-07'
    });

    expect(slotState(availability.days[0]!.slots).slice(0, 9)).toEqual([
      '08:00:past_time',
      '08:30:past_time',
      '09:00:past_time',
      '09:30:past_time',
      '10:00:past_time',
      '10:30:past_time',
      '11:00:past_time',
      '11:30:past_time',
      '12:00:past_time'
    ]);
    expect(slotState(availability.days[0]!.slots).slice(9, 13)).toEqual(['12:30:enabled', '13:00:enabled', '13:30:enabled', '14:00:progressive_release']);
  });
});
