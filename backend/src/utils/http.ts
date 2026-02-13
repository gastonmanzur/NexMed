import { Response } from "express";

export function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function fail(res: Response, error: string, status = 400) {
  return res.status(status).json({ ok: false, error });
}
