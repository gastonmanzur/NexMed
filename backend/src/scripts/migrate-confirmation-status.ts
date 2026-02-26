import mongoose from "mongoose";
import { env } from "../config/env";
import { Appointment } from "../models/Appointment";

async function run() {
  await mongoose.connect(env.mongoUri);

  const result = await Appointment.updateMany(
    { confirmationStatus: { $exists: false } },
    [
      {
        $set: {
          confirmationStatus: "confirmed",
          confirmedAt: "$createdAt",
        },
      },
    ] as any
  );

  console.info("[migrate-confirmation-status] completed", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error("[migrate-confirmation-status] failed", error);
  process.exitCode = 1;
});
