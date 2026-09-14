import { query } from "../db/pool.js";

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  recentAvgTotal: number | null;
  percentile: number;
  improvementVs30Day: number | null;
  isSelf: boolean;
}

/**
 * Ranked by percentile within the friend group (recent 7-day average score),
 * never by raw score. Each entry also carries the user's own improvement vs
 * their trailing 30-day average as a secondary, non-ranking signal.
 */
export async function getFriendsLeaderboard(userId: string): Promise<LeaderboardEntry[]> {
  const memberIds = await query<{ id: string }>(
    `select u.id from users u
     where u.id = $1
        or u.id in (select friend_id from friendships where user_id = $1 and status = 'accepted')
        or u.id in (select user_id from friendships where friend_id = $1 and status = 'accepted')`,
    [userId]
  );
  const ids = memberIds.rows.map((r) => r.id);
  if (ids.length === 0) return [];

  const stats = await query<{
    id: string;
    display_name: string;
    recent_avg: number | null;
    baseline_avg: number | null;
  }>(
    `select
       u.id,
       u.display_name,
       (select avg(sc.total) from sessions se join scores sc on sc.session_id = se.id
          where se.user_id = u.id and se.is_private = false and se.created_at > now() - interval '7 days') as recent_avg,
       (select avg(sc.total) from sessions se join scores sc on sc.session_id = se.id
          where se.user_id = u.id and se.created_at between now() - interval '30 days' and now() - interval '7 days') as baseline_avg
     from users u
     where u.id = any($1::uuid[])`,
    [ids]
  );

  const ranked = stats.rows
    .filter((r) => r.recent_avg !== null)
    .sort((a, b) => Number(b.recent_avg) - Number(a.recent_avg));

  const n = ranked.length;
  const entries: LeaderboardEntry[] = ranked.map((r, idx) => ({
    userId: r.id,
    displayName: r.display_name,
    recentAvgTotal: r.recent_avg === null ? null : Number(r.recent_avg),
    percentile: n <= 1 ? 100 : Math.round(((n - 1 - idx) / (n - 1)) * 100),
    improvementVs30Day:
      r.recent_avg !== null && r.baseline_avg !== null ? Number(r.recent_avg) - Number(r.baseline_avg) : null,
    isSelf: r.id === userId,
  }));

  return entries;
}
