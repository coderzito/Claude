import { query } from "../db/pool.js";

// The only v1 success metric: does a user start a second session without being
// prompted. Every session_started event is logged here; see routes/metrics.ts
// for the aggregate query.
export async function logEvent(userId: string | null, event: string, properties: Record<string, unknown> = {}) {
  await query("insert into analytics_events (user_id, event, properties) values ($1, $2, $3)", [
    userId,
    event,
    JSON.stringify(properties),
  ]);
}
