import assert from "node:assert/strict";
import { computeProfessionalSlots } from "../services/availabilityService";

function clinicMidnight(date: string) {
  return new Date(`${date}T03:00:00.000Z`);
}

function run() {
  const mondaySlots = computeProfessionalSlots({
    from: clinicMidnight("2026-01-05"),
    to: clinicMidnight("2026-01-06"),
    professionalConfigs: [
      {
        professionalId: "pro-1",
        weeklyBlocks: [{ weekday: 1, startTime: "09:00", endTime: "12:00", slotMinutes: 30 }],
      },
    ],
    timeOffByKey: new Map(),
    bookedSet: new Set(),
  });

  assert.equal(mondaySlots[0]?.startAt.toISOString(), "2026-01-05T12:00:00.000Z");
  assert.equal((mondaySlots[mondaySlots.length - 1])?.startAt.toISOString(), "2026-01-05T14:30:00.000Z");
  assert.equal(mondaySlots.length, 6);

  const saturdaySlots = computeProfessionalSlots({
    from: clinicMidnight("2026-01-10"),
    to: clinicMidnight("2026-01-11"),
    professionalConfigs: [
      {
        professionalId: "pro-2",
        weeklyBlocks: [{ weekday: 6, startTime: "16:00", endTime: "19:00", slotMinutes: 30 }],
      },
    ],
    timeOffByKey: new Map(),
    bookedSet: new Set(),
  });

  assert.equal(saturdaySlots[0]?.startAt.toISOString(), "2026-01-10T19:00:00.000Z");
  assert.equal((saturdaySlots[saturdaySlots.length - 1])?.startAt.toISOString(), "2026-01-10T21:30:00.000Z");
  assert.equal(saturdaySlots.length, 6);

  const noFallbackSlots = computeProfessionalSlots({
    from: clinicMidnight("2026-01-05"),
    to: clinicMidnight("2026-01-06"),
    professionalConfigs: [{ professionalId: "pro-3", weeklyBlocks: [] }],
    timeOffByKey: new Map(),
    bookedSet: new Set(),
  });

  assert.equal(noFallbackSlots.length, 0);
  console.log("availability regression checks passed");
}

run();
