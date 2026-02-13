import { NextFunction, Request, Response } from "express";
import { verifyJwt } from "../utils/jwt";
import { fail } from "../utils/http";

declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      clinicId: string;
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
    req.auth = verifyJwt(token);
    next();
  } catch {
    return fail(res, "Token inválido", 401);
  }
}
