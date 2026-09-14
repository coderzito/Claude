import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getFriendsLeaderboard } from "../services/leaderboard.js";

export const leaderboardRouter = Router();
leaderboardRouter.use(requireAuth);

leaderboardRouter.get("/", async (req: AuthedRequest, res) => {
  const entries = await getFriendsLeaderboard(req.userId!);
  res.json({ entries });
});

export const friendsRouter = Router();
friendsRouter.use(requireAuth);

friendsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const friend = await query<{ id: string }>("select id from users where email = $1", [parsed.data.email]);
  if (!friend.rows[0]) return res.status(404).json({ error: "user_not_found" });
  if (friend.rows[0].id === req.userId) return res.status(400).json({ error: "cannot_friend_self" });

  await query(
    `insert into friendships (user_id, friend_id, status) values ($1, $2, 'accepted')
     on conflict (user_id, friend_id) do update set status = 'accepted'`,
    [req.userId, friend.rows[0].id]
  );
  // v1 keeps friending mutual/one-step rather than a request-accept flow.
  await query(
    `insert into friendships (user_id, friend_id, status) values ($1, $2, 'accepted')
     on conflict (user_id, friend_id) do update set status = 'accepted'`,
    [friend.rows[0].id, req.userId]
  );

  res.status(201).json({ ok: true });
});

friendsRouter.get("/", async (req: AuthedRequest, res) => {
  const result = await query(
    `select u.id, u.display_name, u.email
     from friendships f join users u on u.id = f.friend_id
     where f.user_id = $1 and f.status = 'accepted'`,
    [req.userId]
  );
  res.json({ friends: result.rows });
});
