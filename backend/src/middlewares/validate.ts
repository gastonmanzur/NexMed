import { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";
import { fail } from "../utils/http";

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, parsed.error.issues.map((i) => i.message).join(", "), 400);
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return fail(res, parsed.error.issues.map((i) => i.message).join(", "), 400);
    }
    req.query = parsed.data as any;
    next();
  };
}

export function validateParams(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      return fail(res, parsed.error.issues.map((i) => i.message).join(", "), 400);
    }
    req.params = parsed.data as any;
    next();
  };
}
