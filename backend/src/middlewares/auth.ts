import { NextFunction, Request, Response } from "express";
import { verifyJwt } from "../utils/jwt";
import { fail } from "../utils/http";

declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      id: string;
      type: "clinic" | "patient";
    };
  }
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return fail(res, "No autorizado", 401);
  }

  try {
    const payload = verifyJwt(token);
    req.auth = { id: payload.sub, type: payload.type };
    next();
  } catch {
    return fail(res, "Token inválido", 401);
  }
}

export function clinicOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.auth || req.auth.type !== "clinic") {
    return fail(res, "No autorizado", 403);
  }
  next();
}

export function patientOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.auth || req.auth.type !== "patient") {
    return fail(res, "No autorizado", 403);
  }
  next();
}
