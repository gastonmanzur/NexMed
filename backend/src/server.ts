import { app } from "./app";
import { env } from "./config/env";
import { connectDB } from "./db/connect";
import { startReminderScheduler } from "./jobs/reminderScheduler";

async function main() {
  await connectDB();
  startReminderScheduler();
  app.listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
