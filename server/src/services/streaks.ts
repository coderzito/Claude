import { query } from "../db/pool.js";
import { config } from "../config.js";

function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function monthOf(dateISO: string): string {
  return dateISO.slice(0, 7) + "-01";
}

function addWeeks(dateISO: string, weeks: number): string {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

interface StreakRow {
  user_id: string;
  week_start: string;
  sessions_completed: number;
  freezes_remaining: number;
  freeze_month: string;
  league: string;
  percentile: number | null;
}

/**
 * Lazily rolls the streak forward to the current week: closes out any elapsed
 * week(s) by checking whether quota was hit or a freeze covers the gap, resets
 * the monthly freeze allowance on a new calendar month, and returns the row
 * for the current week (creating it if needed).
 */
export async function ensureCurrentWeekStreak(userId: string): Promise<StreakRow> {
  const currentWeek = mondayOf(new Date());

  const latestRes = await query<StreakRow>(
    "select * from streaks where user_id = $1 order by week_start desc limit 1",
    [userId]
  );
  let latest = latestRes.rows[0];

  if (!latest) {
    const inserted = await query<StreakRow>(
      `insert into streaks (user_id, week_start, sessions_completed, freezes_remaining, freeze_month)
       values ($1, $2, 0, $3, $4) returning *`,
      [userId, currentWeek, config.app.monthlyFreezes, monthOf(currentWeek)]
    );
    return inserted.rows[0];
  }

  while (latest.week_start < currentWeek) {
    const nextWeek = addWeeks(latest.week_start, 1);
    const nextMonth = monthOf(nextWeek);
    const monthRolled = nextMonth !== latest.freeze_month;
    const freezesAvailable = monthRolled ? config.app.monthlyFreezes : latest.freezes_remaining;

    const metQuota = latest.sessions_completed >= config.app.weeklyQuotaSessions;
    let streakContinues = metQuota;
    let freezesAfter = freezesAvailable;

    if (!metQuota && freezesAvailable > 0) {
      streakContinues = true;
      freezesAfter = freezesAvailable - 1;
    }

    if (!streakContinues) {
      await query("update users set current_streak_weeks = 0 where id = $1", [userId]);
    } else if (metQuota) {
      await query("update users set current_streak_weeks = current_streak_weeks + 1 where id = $1", [userId]);
    }
    // a freeze preserves the streak count without incrementing it

    const insertedNext = await query<StreakRow>(
      `insert into streaks (user_id, week_start, sessions_completed, freezes_remaining, freeze_month)
       values ($1, $2, 0, $3, $4)
       on conflict (user_id, week_start) do nothing
       returning *`,
      [userId, nextWeek, freezesAfter, nextMonth]
    );
    latest = insertedNext.rows[0] ?? (await query<StreakRow>(
      "select * from streaks where user_id = $1 and week_start = $2",
      [userId, nextWeek]
    )).rows[0];
  }

  return latest;
}

export async function recordCompletedSession(userId: string): Promise<void> {
  const current = await ensureCurrentWeekStreak(userId);
  await query(
    "update streaks set sessions_completed = sessions_completed + 1 where user_id = $1 and week_start = $2",
    [userId, current.week_start]
  );
}
