import jwt from "jsonwebtoken";
import { config } from "../config.js";

export interface AuthTokenPayload {
  userId: string;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, config.jwt.secret) as AuthTokenPayload;
}
