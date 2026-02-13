import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type JwtPayload = {
  clinicId: string;
};

export function signJwt(payload: JwtPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
