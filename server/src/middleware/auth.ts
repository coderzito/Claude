import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt.js";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }
  try {
    const payload = verifyToken(header.slice("Bearer ".length));
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}
