import bcrypt from "bcryptjs";
import { connectDB } from "../db/connect";
import { Clinic } from "../models/Clinic";

async function main() {
  await connectDB();
  const email = process.env.SEED_EMAIL ?? "demo@clinica.com";
  const password = process.env.SEED_PASSWORD ?? "123456";

  const exists = await Clinic.findOne({ email });
  if (exists) {
    console.log("Clinic already exists", { email, slug: exists.slug });
    process.exit(0);
  }

  const clinic = await Clinic.create({
    name: "Clínica Demo",
    email,
    passwordHash: await bcrypt.hash(password, 10),
    slug: "clinica-demo",
  });

  console.log("Clinic created", { email, password, slug: clinic.slug });
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
