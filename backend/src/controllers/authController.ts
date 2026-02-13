import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Clinic } from "../models/Clinic";
import { Patient } from "../models/Patient";
import { fail, ok } from "../utils/http";
import { signJwt } from "../utils/jwt";
import { slugify } from "../utils/slug";
import { emailExists, findUserByEmail } from "../services/authService";

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

function authPayload(user: { id: string; type: "clinic" | "patient"; email: string; displayName: string }, token: string) {
  return {
    token,
    user,
  };
}

export async function register(req: Request, res: Response) {
  const { type, email, password } = req.body;

  if (await emailExists(email)) {
    return fail(res, "El email ya está registrado", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  if (type === "clinic") {
    const slug = await makeUniqueSlug(req.body.name);
    const clinic = await Clinic.create({
      name: req.body.name,
      email,
      passwordHash,
      slug,
      phone: req.body.phone,
      address: req.body.address,
      city: req.body.city,
    });

    const user = {
      id: clinic._id.toString(),
      type: "clinic" as const,
      email: clinic.email,
      displayName: clinic.name,
    };

    const token = signJwt({ sub: user.id, type: user.type });
    return ok(res, authPayload(user, token), 201);
  }

  const patient = await Patient.create({
    email,
    passwordHash,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    age: req.body.age,
    phone: req.body.phone,
  });

  const user = {
    id: patient._id.toString(),
    type: "patient" as const,
    email: patient.email,
    displayName: `${patient.firstName} ${patient.lastName}`.trim(),
  };

  const token = signJwt({ sub: user.id, type: user.type });
  return ok(res, authPayload(user, token), 201);
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const userRecord = await findUserByEmail(email);
  if (!userRecord) return fail(res, "Credenciales inválidas", 401);

  const isValid = await bcrypt.compare(password, userRecord.passwordHash);
  if (!isValid) return fail(res, "Credenciales inválidas", 401);

  const user = {
    id: userRecord.id,
    type: userRecord.type,
    email: userRecord.email,
    displayName: userRecord.displayName,
  };

  const token = signJwt({ sub: user.id, type: user.type });
  return ok(res, authPayload(user, token));
}

export async function me(req: Request, res: Response) {
  if (!req.auth) return fail(res, "No autorizado", 401);

  if (req.auth.type === "clinic") {
    const clinic = await Clinic.findById(req.auth.id).select({ passwordHash: 0 }).lean();
    if (!clinic) return fail(res, "Usuario no encontrado", 404);
    return ok(res, { ...clinic, type: "clinic" });
  }

  const patient = await Patient.findById(req.auth.id).select({ passwordHash: 0 }).lean();
  if (!patient) return fail(res, "Usuario no encontrado", 404);
  return ok(res, { ...patient, type: "patient" });
}
