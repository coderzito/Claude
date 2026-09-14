import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "../db/pool.js";
import { config } from "../config.js";
import { signToken } from "../lib/jwt.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const result = await query<{
    id: string;
    email: string;
    display_name: string;
    free_tier_sessions_today: number;
    free_tier_day: string;
  }>(
    "select id, email, display_name, free_tier_sessions_today, free_tier_day from users where id = $1",
    [req.userId]
  );
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: "not_found" });

  const today = new Date().toISOString().slice(0, 10);
  const sessionsToday = user.free_tier_day === today ? user.free_tier_sessions_today : 0;

  res.json({
    user: { id: user.id, email: user.email, displayName: user.display_name },
    quota: { sessionsUsedToday: sessionsToday, dailyLimit: config.app.freeTierDailySessions },
  });
});

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(60).optional(),
});

authRouter.post("/signup", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const { email, password, displayName } = parsed.data;

  const existing = await query("select id from users where email = $1", [email]);
  if (existing.rowCount) return res.status(409).json({ error: "email_taken" });

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query<{ id: string; display_name: string; email: string }>(
    `insert into users (email, password_hash, display_name)
     values ($1, $2, $3) returning id, email, display_name`,
    [email, passwordHash, displayName ?? email.split("@")[0]]
  );
  const user = result.rows[0];
  const token = signToken({ userId: user.id });
  res.status(201).json({ token, user: { id: user.id, email: user.email, displayName: user.display_name } });
});

authRouter.post("/login", async (req, res) => {
  const parsed = credentialsSchema.pick({ email: true, password: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const { email, password } = parsed.data;

  const result = await query<{ id: string; password_hash: string; display_name: string; email: string }>(
    "select id, password_hash, display_name, email from users where email = $1",
    [email]
  );
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "invalid_credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "invalid_credentials" });

  const token = signToken({ userId: user.id });
  res.json({ token, user: { id: user.id, email: user.email, displayName: user.display_name } });
});
