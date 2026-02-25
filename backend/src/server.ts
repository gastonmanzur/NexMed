import { app } from "./app";
import { env } from "./config/env";
import { connectDB } from "./db/connect";
import { startReminderScheduler } from "./jobs/reminderScheduler";
import { Appointment } from "./models/Appointment";


async function syncAppointmentIndexes() {
  try {
    const syncResult = await Appointment.syncIndexes();
    if (process.env.NODE_ENV !== "production") {
      const indexes = await Appointment.collection.indexes();
      console.log("[db] appointment syncIndexes result", syncResult);
      console.log("[db] appointment indexes", indexes.map((idx) => idx.name));
    }
  } catch (error: any) {
    const message = String(error?.message ?? error);
    if (message.includes("E11000")) {
      console.error("Cannot create unique index, duplicates exist. Run /api/dev/appointments/dedup");
      return;
    }
    throw error;
  }
}

async function main() {
  await connectDB();
  await syncAppointmentIndexes();
  startReminderScheduler();
  app.listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
