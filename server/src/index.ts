import express from "express";
import "express-async-errors";
import cors from "cors";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { decksRouter } from "./routes/decks.js";
import { subtopicsRouter } from "./routes/subtopics.js";
import { sessionsRouter } from "./routes/sessions.js";
import { streaksRouter } from "./routes/streaks.js";
import { leaderboardRouter, friendsRouter } from "./routes/leaderboard.js";
import { metricsRouter } from "./routes/metrics.js";

const app = express();
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/decks", decksRouter);
app.use("/subtopics", subtopicsRouter);
app.use("/sessions", sessionsRouter);
app.use("/streak", streaksRouter);
app.use("/leaderboard", leaderboardRouter);
app.use("/friends", friendsRouter);
app.use("/metrics", metricsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal_error" });
});

app.listen(config.port, () => {
  console.log(`passion-study server listening on :${config.port}`);
});
