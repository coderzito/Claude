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

streaksRouter.get("/history", async (req: AuthedRequest, res) => {
  await ensureCurrentWeekStreak(req.userId!);

  const weeks = await query<{ week_start: string; sessions_completed: number }>(
    `select week_start, sessions_completed
       from streaks
      where user_id = $1
      order by week_start desc
      limit 8`,
    [req.userId]
  );

  const months = await query<{ month: string; sessions_completed: number; avg_score: number | null }>(
    `select date_trunc('month', s.created_at)::date as month,
            count(*) filter (where s.status = 'scored')::int as sessions_completed,
            avg(sc.total) filter (where s.status = 'scored') as avg_score
       from sessions s
       left join scores sc on sc.session_id = s.id
      where s.user_id = $1
        and s.created_at >= date_trunc('month', current_date) - interval '5 months'
      group by 1
      order by 1 desc`,
    [req.userId]
  );

  res.json({
    weeklyQuota: config.app.weeklyQuotaSessions,
    weeks: weeks.rows.map((w) => ({
      weekStart: w.week_start,
      sessionsCompleted: w.sessions_completed,
    })),
    months: months.rows.map((m) => ({
      month: m.month,
      sessionsCompleted: m.sessions_completed,
      avgScore: m.avg_score === null ? null : Number(m.avg_score),
    })),
  });
});
