import { describe, expect, it } from 'vitest';
import { applyProgressiveReleaseBatches, type SlotForProgressiveRelease } from './progressive-release.js';

type TestSlot = SlotForProgressiveRelease & { time: string };

const slot = (time: string, isOccupied = false): TestSlot => {
  const [hours, minutes] = time.split(':').map(Number) as [number, number];
  const startAt = new Date(Date.UTC(2030, 0, 7, hours, minutes));
  const endAt = new Date(startAt.getTime() + 30 * 60_000);
  return { time, startAt, endAt, isOccupied };
};

const apply = (slots: TestSlot[], releaseLimit = 3) => applyProgressiveReleaseBatches({ slots, releaseLimit }).slots;

const stateByTime = (slots: ReturnType<typeof apply>) =>
  Object.fromEntries(slots.map((result) => [result.time, result.available ? 'available' : result.blockedReason]));

describe('applyProgressiveReleaseBatches', () => {
  it('Test 1 — estado inicial: habilita solo la primera tanda fija', () => {
    const result = apply(['08:00', '08:30', '09:00', '09:30', '10:00', '10:30'].map((time) => slot(time)));

    expect(stateByTime(result)).toEqual({
      '08:00': 'available',
      '08:30': 'available',
      '09:00': 'available',
      '09:30': 'progressive_release',
      '10:00': 'progressive_release',
      '10:30': 'progressive_release'
    });
    expect(result.map((item) => [item.time, item.releaseBatchIndex, item.releaseBatchActive])).toEqual([
      ['08:00', 0, true],
      ['08:30', 0, true],
      ['09:00', 0, true],
      ['09:30', 1, false],
      ['10:00', 1, false],
      ['10:30', 1, false]
    ]);
  });

  it('Test 2 — solo primer slot ocupado: no adelanta slots de la segunda tanda', () => {
    const result = apply([
      slot('08:00', true),
      slot('08:30'),
      slot('09:00'),
      slot('09:30'),
      slot('10:00'),
      slot('10:30')
    ]);

    expect(stateByTime(result)).toEqual({
      '08:00': 'occupied',
      '08:30': 'available',
      '09:00': 'available',
      '09:30': 'progressive_release',
      '10:00': 'progressive_release',
      '10:30': 'progressive_release'
    });
  });

  it('Test 3 — primera tanda completa: habilita la segunda tanda y bloquea posteriores', () => {
    const result = apply([
      slot('08:00', true),
      slot('08:30', true),
      slot('09:00', true),
      slot('09:30'),
      slot('10:00'),
      slot('10:30'),
      slot('11:00')
    ]);

    expect(stateByTime(result)).toMatchObject({
      '08:00': 'occupied',
      '08:30': 'occupied',
      '09:00': 'occupied',
      '09:30': 'available',
      '10:00': 'available',
      '10:30': 'available',
      '11:00': 'progressive_release'
    });
  });

  it('Test 4 — cancelación en tanda anterior: vuelve hacia atrás si queda incompleta', () => {
    const result = apply([
      slot('08:00', true),
      slot('08:30'),
      slot('09:00', true),
      slot('09:30'),
      slot('10:00'),
      slot('10:30')
    ]);

    expect(stateByTime(result)).toMatchObject({
      '08:00': 'occupied',
      '08:30': 'available',
      '09:00': 'occupied',
      '09:30': 'progressive_release',
      '10:00': 'progressive_release',
      '10:30': 'progressive_release'
    });
  });

  it('Test 5 — agenda libre: la función pura no se aplica y el mapeo libre mantiene todos los slots libres', () => {
    const freeMode = ['08:00', '08:30', '09:00', '09:30'].map((time) => ({ ...slot(time), available: true }));

    expect(freeMode.map((item) => [item.time, item.available])).toEqual([
      ['08:00', true],
      ['08:30', true],
      ['09:00', true],
      ['09:30', true]
    ]);
  });
});
