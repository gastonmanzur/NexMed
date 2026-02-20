import { Types } from "mongoose";
import { ClinicNotificationSettings } from "../models/ClinicNotificationSettings";
import { Reminder } from "../models/Reminder";
import { sendReminderEmail } from "../services/mailer";

const POLL_MS = 30_000;
const BATCH_SIZE = 50;
let started = false;
let timer: NodeJS.Timeout | null = null;

async function processReminder(reminderId: Types.ObjectId) {
  const locked = await Reminder.findOneAndUpdate(
    { _id: reminderId, status: "scheduled" },
    { status: "sending", errorMessage: "" },
    { new: true }
  );

  if (!locked) return;

  try {
    if (locked.channel === "email") {
      const settings = await ClinicNotificationSettings.findOne({ clinicId: locked.clinicId }).lean();
      await sendReminderEmail(locked, settings?.timezone ?? "America/Argentina/Buenos_Aires");
    }

    await Reminder.updateOne({ _id: locked._id, status: "sending" }, { status: "sent", sentAt: new Date(), errorMessage: "" });
  } catch (error: any) {
    await Reminder.updateOne(
      { _id: locked._id, status: "sending" },
      { status: "failed", errorMessage: error?.message ?? "Error al enviar recordatorio" }
    );
  }
}

async function tick() {
  const due = await Reminder.find({ status: "scheduled", scheduledFor: { $lte: new Date() } })
    .sort({ scheduledFor: 1 })
    .limit(BATCH_SIZE)
    .select("_id")
    .lean();

  for (const reminder of due) {
    await processReminder(reminder._id);
  }
}

export function startReminderScheduler() {
  if (started) return;
  started = true;

  timer = setInterval(() => {
    tick().catch((error) => {
      console.error("[reminderScheduler]", error);
    });
  }, POLL_MS);

  tick().catch((error) => {
    console.error("[reminderScheduler]", error);
  });
}

export function stopReminderScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  started = false;
}
