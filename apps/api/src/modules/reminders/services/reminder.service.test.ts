import { describe, expect, it, vi } from 'vitest';
import { ReminderService } from './reminder.service.js';

describe('ReminderService scheduling algorithm', () => {
  const baseAppointment = {
    _id: { toString: () => 'a1' },
    organizationId: { toString: () => 'o1' },
    status: 'booked'
  };

  it('schedules valid reminders and resolves t2=t3 collision with priority', async () => {
    const upsertPending = vi.fn(async () => undefined);
    const cancelPendingByAppointment = vi.fn(async () => 0);
    const service = new ReminderService({} as never, {} as never, {} as never, { upsertPending, cancelPendingByAppointment } as never);

    const now = new Date('2026-05-05T10:00:00.000Z');
    const createdAt = new Date('2026-05-05T10:00:00.000Z');
    const startAt = new Date('2026-05-07T10:00:00.000Z');

    await service.scheduleForAppointment({ ...baseAppointment, createdAt, startAt }, now);

    expect(upsertPending).toHaveBeenCalledTimes(2);
    expect(upsertPending.mock.calls.map((c) => c[0].reminderType)).toEqual(['last_before_appointment', 'second_half']);
  });

  it('filters reminders in the past and keeps priority on collisions', async () => {
    const upsertPending = vi.fn(async () => undefined);
    const cancelPendingByAppointment = vi.fn(async () => 0);
    const service = new ReminderService({} as never, {} as never, {} as never, { upsertPending, cancelPendingByAppointment } as never);

    const now = new Date('2026-05-06T09:30:00.000Z');
    const createdAt = new Date('2026-05-05T09:00:00.000Z');
    const startAt = new Date('2026-05-06T10:00:00.000Z');

    await service.scheduleForAppointment({ ...baseAppointment, createdAt, startAt }, now);

    const reminderTypes = upsertPending.mock.calls.map((c) => c[0].reminderType);
    expect(reminderTypes).toEqual([]);
  });

  it('cancels pending reminders for non-booked appointments', async () => {
    const upsertPending = vi.fn(async () => undefined);
    const cancelPendingByAppointment = vi.fn(async () => 0);
    const service = new ReminderService({} as never, {} as never, {} as never, { upsertPending, cancelPendingByAppointment } as never);

    await service.scheduleForAppointment({ ...baseAppointment, status: 'canceled_by_staff', startAt: new Date() }, new Date());

    expect(cancelPendingByAppointment).toHaveBeenCalledTimes(1);
    expect(upsertPending).not.toHaveBeenCalled();
  });
});
