import assert from "node:assert/strict";
import { computeProfessionalSlots } from "../services/availabilityService";
import { DEFAULT_CLINIC_TIMEZONE, formatDateKeyInClinicTz, getWeekdayInClinicTz } from "../utils/datetime";

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

  assert.equal(mondaySlots.length, 6);
  assert.equal(formatDateKeyInClinicTz(mondaySlots[0]!.startAt, DEFAULT_CLINIC_TIMEZONE), "2026-01-05");
  assert.equal(getWeekdayInClinicTz(mondaySlots[0]!.startAt, DEFAULT_CLINIC_TIMEZONE), 1);

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

  assert.equal(saturdaySlots.length, 6);
  assert.equal(formatDateKeyInClinicTz(saturdaySlots[0]!.startAt, DEFAULT_CLINIC_TIMEZONE), "2026-01-10");
  assert.equal(getWeekdayInClinicTz(saturdaySlots[0]!.startAt, DEFAULT_CLINIC_TIMEZONE), 6);

  const noFallbackSlots = computeProfessionalSlots({
    from: clinicMidnight("2026-01-05"),
    to: clinicMidnight("2026-01-06"),
    professionalConfigs: [{ professionalId: "pro-3", weeklyBlocks: [] }],
    timeOffByKey: new Map(),
    bookedSet: new Set(),
  });

  assert.equal(noFallbackSlots.length, 0);

  const bookingDaySlots = computeProfessionalSlots({
    from: clinicMidnight("2026-02-20"),
    to: clinicMidnight("2026-02-21"),
    professionalConfigs: [
      {
        professionalId: "pro-4",
        weeklyBlocks: [{ weekday: 5, startTime: "09:00", endTime: "17:00", slotMinutes: 30 }],
      },
    ],
    timeOffByKey: new Map(),
    bookedSet: new Set(),
  });

  const fridayIso = "2026-02-20T12:00:00.000Z";
  const thursdayIso = "2026-02-19T12:00:00.000Z";

  assert.equal(getWeekdayInClinicTz(fridayIso, DEFAULT_CLINIC_TIMEZONE), 5);
  assert.equal(formatDateKeyInClinicTz(fridayIso, DEFAULT_CLINIC_TIMEZONE), "2026-02-20");
  assert.equal(bookingDaySlots.some((slot) => formatDateKeyInClinicTz(slot.startAt, DEFAULT_CLINIC_TIMEZONE) === "2026-02-20"), true);
  assert.equal(getWeekdayInClinicTz(thursdayIso, DEFAULT_CLINIC_TIMEZONE), 4);
  assert.equal(bookingDaySlots.some((slot) => formatDateKeyInClinicTz(slot.startAt, DEFAULT_CLINIC_TIMEZONE) === "2026-02-19"), false);

  console.log("availability regression checks passed");
}

run();
