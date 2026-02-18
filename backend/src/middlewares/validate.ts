import { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";
import { fail } from "../utils/http";

declare module "express-serve-static-core" {
  interface Locals {
    validated?: {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    };
  }
}

function getValidated(res: Response) {
  if (!res.locals.validated) {
    res.locals.validated = {};
  }
  return res.locals.validated;
}

function zodErrorMessage(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return error.issues
    .map((issue) => `${issue.path.map((p) => String(p)).join(".") || "request"}: ${issue.message}`)
    .join(", ");
}

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, zodErrorMessage(parsed.error), 400);
    }
    getValidated(res).body = parsed.data;
    next();
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return fail(res, zodErrorMessage(parsed.error), 400);
    }
    getValidated(res).query = parsed.data;
    next();
  };
}

export function validateParams(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      return fail(res, zodErrorMessage(parsed.error), 400);
    }
    getValidated(res).params = parsed.data;
    next();
  };
}
