import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Clinic } from "../models/Clinic";
import { fail, ok } from "../utils/http";
import { signJwt } from "../utils/jwt";
import { slugify } from "../utils/slug";

async function makeUniqueSlug(base: string) {
  const safeBase = slugify(base) || "clinica";
  let slug = safeBase;
  let idx = 1;

  while (await Clinic.exists({ slug })) {
    idx += 1;
    slug = `${safeBase}-${idx}`;
  }

  return slug;
}

export async function registerClinic(req: Request, res: Response) {
  const { name, email, password } = req.body;

  const existing = await Clinic.findOne({ email });
  if (existing) return fail(res, "El email ya está registrado", 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const slug = await makeUniqueSlug(name);

  const clinic = await Clinic.create({ name, email, passwordHash, slug });
  const token = signJwt({ clinicId: clinic._id.toString() });

  return ok(
    res,
    {
      token,
      clinic: {
        id: clinic._id,
        name: clinic.name,
        email: clinic.email,
        slug: clinic.slug,
        settings: clinic.settings,
      },
    },
    201
  );
}

export async function loginClinic(req: Request, res: Response) {
  const { email, password } = req.body;

  const clinic = await Clinic.findOne({ email });
  if (!clinic) return fail(res, "Credenciales inválidas", 401);

  const isValid = await bcrypt.compare(password, clinic.passwordHash);
  if (!isValid) return fail(res, "Credenciales inválidas", 401);

  const token = signJwt({ clinicId: clinic._id.toString() });
  return ok(res, {
    token,
    clinic: {
      id: clinic._id,
      name: clinic.name,
      email: clinic.email,
      slug: clinic.slug,
      settings: clinic.settings,
    },
  });
}
