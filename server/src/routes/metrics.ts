import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const metricsRouter = Router();
metricsRouter.use(requireAuth);

// The only v1 success metric: what fraction of users who start a first session
// go on to start a second one without being prompted.
metricsRouter.get("/second-session-rate", async (_req, res) => {
  const result = await query<{ started_second: string; started_any: string }>(
    `with starters as (
       select user_id, count(*) filter (where event = 'session_started') as sessions_started
       from analytics_events
       group by user_id
     )
     select
       count(*) filter (where sessions_started >= 2) as started_second,
       count(*) as started_any
     from starters`
  );
  const row = result.rows[0];
  const startedAny = Number(row.started_any);
  const startedSecond = Number(row.started_second);
  res.json({
    startedAny,
    startedSecond,
    rate: startedAny === 0 ? null : startedSecond / startedAny,
  });
});
