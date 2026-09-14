import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const subtopicsRouter = Router();
subtopicsRouter.use(requireAuth);

// Shared pool every free-typed topic lands in (seeded in db/seed.sql), so the
// same typed topic is cached and reused across every user instead of each
// person paying for their own generation call.
const CUSTOM_TOPICS_DECK_ID = "00000000-0000-0000-0000-00000000000e";

// "What do you want to study?" — turns free text directly into a rollable
// subtopic (creating it if this exact topic hasn't been typed before).
subtopicsRouter.post("/custom", async (req: AuthedRequest, res) => {
  const parsed = z.object({ topic: z.string().trim().min(3).max(150) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_topic" });

  const result = await query<{ id: string; title: string; difficulty_tier: string }>(
    `insert into subtopics (deck_id, title, difficulty_tier)
     values ($1, $2, 'core')
     on conflict (deck_id, title) do update set title = excluded.title
     returning id, title, difficulty_tier`,
    [CUSTOM_TOPICS_DECK_ID, parsed.data.topic]
  );

  res.json({ subtopic: result.rows[0] });
});
