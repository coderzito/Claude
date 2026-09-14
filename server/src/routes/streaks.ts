import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { ensureCurrentWeekStreak } from "../services/streaks.js";
import { config } from "../config.js";

export const streaksRouter = Router();
streaksRouter.use(requireAuth);

streaksRouter.get("/", async (req: AuthedRequest, res) => {
  const current = await ensureCurrentWeekStreak(req.userId!);
  const user = await query<{ current_streak_weeks: number }>("select current_streak_weeks from users where id = $1", [
    req.userId,
  ]);
  res.json({
    weekStart: current.week_start,
    sessionsCompleted: current.sessions_completed,
    weeklyQuota: config.app.weeklyQuotaSessions,
    freezesRemaining: current.freezes_remaining,
    currentStreakWeeks: user.rows[0].current_streak_weeks,
  });
});
