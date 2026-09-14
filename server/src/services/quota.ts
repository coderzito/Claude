import { query } from "../db/pool.js";
import { config } from "../config.js";

export class DailyQuotaExceededError extends Error {}

/** Each session costs a generation + transcription + grading call, so free-tier volume is capped per day. */
export async function consumeDailySessionQuota(userId: string): Promise<void> {
  const result = await query<{ free_tier_sessions_today: number; free_tier_day: string }>(
    "select free_tier_sessions_today, free_tier_day from users where id = $1 for update",
    [userId]
  );
  const user = result.rows[0];
  const today = new Date().toISOString().slice(0, 10);

  const sessionsToday = user.free_tier_day === today ? user.free_tier_sessions_today : 0;
  if (sessionsToday >= config.app.freeTierDailySessions) {
    throw new DailyQuotaExceededError();
  }

  await query("update users set free_tier_sessions_today = $1, free_tier_day = $2 where id = $3", [
    sessionsToday + 1,
    today,
    userId,
  ]);
}
