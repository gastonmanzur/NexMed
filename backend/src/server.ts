import { app } from "./app";
import { env } from "./config/env";
import { connectDB } from "./db/connect";

async function main() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
