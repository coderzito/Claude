import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { query } from "../db/pool.js";
import { config } from "../config.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getOrCreateChapter } from "../services/chapters.js";
import { consumeDailySessionQuota, DailyQuotaExceededError } from "../services/quota.js";
import { uploadAudio, audioKeyFor } from "../lib/storage.js";
import { enqueueJob } from "../services/jobs.js";
import { logEvent } from "../lib/analytics.js";

export const sessionsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

sessionsRouter.use(requireAuth);

// Start a session: cache-or-generate the chapter, start the server-authoritative study clock.
sessionsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = z.object({ subtopicId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  try {
    await consumeDailySessionQuota(req.userId!);
  } catch (err) {
    if (err instanceof DailyQuotaExceededError) return res.status(429).json({ error: "daily_quota_exceeded" });
    throw err;
  }

  const chapter = await getOrCreateChapter(parsed.data.subtopicId);

  const priorCount = await query<{ count: string }>("select count(*) from sessions where user_id = $1", [req.userId]);
  const sessionNumber = Number(priorCount.rows[0].count) + 1;
  const isPrivate = sessionNumber <= config.app.privateSessionCount;

  const inserted = await query(
    `insert into sessions (user_id, subtopic_id, chapter_id, is_private)
     values ($1, $2, $3, $4) returning id, study_started_at`,
    [req.userId, parsed.data.subtopicId, chapter.id, isPrivate]
  );
  const session = inserted.rows[0];

  await logEvent(req.userId!, "session_started", { sessionNumber, isSecondSession: sessionNumber === 2 });

  res.status(201).json({
    session: {
      id: session.id,
      studyStartedAt: session.study_started_at,
      studyEndsAt: new Date(new Date(session.study_started_at).getTime() + config.app.studyMinutes * 60_000),
    },
    chapter: { id: chapter.id, bodyMd: chapter.body_md },
  });
});

sessionsRouter.get("/", async (req: AuthedRequest, res) => {
  const result = await query(
    `select se.id, se.status, se.created_at, se.duration_s, sub.title as subtopic_title,
            sc.total, sc.accuracy, sc.coverage, sc.structure, sc.delivery
     from sessions se
     join subtopics sub on sub.id = se.subtopic_id
     left join scores sc on sc.session_id = se.id
     where se.user_id = $1
     order by se.created_at desc
     limit 100`,
    [req.userId]
  );
  res.json({ sessions: result.rows });
});

sessionsRouter.get("/:id", async (req: AuthedRequest, res) => {
  const result = await query(
    `select se.*, ch.body_md, ch.key_points
     from sessions se join chapters ch on ch.id = se.chapter_id
     where se.id = $1 and se.user_id = $2`,
    [req.params.id, req.userId]
  );
  const session = result.rows[0];
  if (!session) return res.status(404).json({ error: "not_found" });

  const now = Date.now();
  const studyEndsAt = new Date(session.study_started_at).getTime() + config.app.studyMinutes * 60_000;
  const studySecondsRemaining = Math.max(0, Math.round((studyEndsAt - now) / 1000));
  const studyElapsedMinutes = (now - new Date(session.study_started_at).getTime()) / 60_000;

  res.json({
    session: {
      id: session.id,
      status: session.status,
      rejectReason: session.reject_reason,
      studyStartedAt: session.study_started_at,
      studySecondsRemaining,
      canStartRecording: studyElapsedMinutes >= config.app.minStudyMinutesBeforeSpeech,
      speechStartedAt: session.speech_started_at,
      durationS: session.duration_s,
    },
    chapter: {
      bodyMd: session.body_md,
      // Weight/source_line stay server-side for grading; the client only
      // needs the claim text for a quick "what to cover" checklist.
      keyPoints: (session.key_points as { id: string; claim: string }[]).map((kp) => ({ id: kp.id, claim: kp.claim })),
    },
  });
});

// Server-side gate: recording cannot start until enough study time has elapsed,
// regardless of what the client's cosmetic countdown shows.
sessionsRouter.post("/:id/speech/start", async (req: AuthedRequest, res) => {
  const result = await query(
    "select id, study_started_at, status from sessions where id = $1 and user_id = $2",
    [req.params.id, req.userId]
  );
  const session = result.rows[0];
  if (!session) return res.status(404).json({ error: "not_found" });
  if (session.status !== "studying") return res.status(409).json({ error: "wrong_status", status: session.status });

  const elapsedMinutes = (Date.now() - new Date(session.study_started_at).getTime()) / 60_000;
  if (elapsedMinutes < config.app.minStudyMinutesBeforeSpeech) {
    return res.status(403).json({ error: "studied_too_briefly", elapsedMinutes });
  }

  const updated = await query(
    "update sessions set status = 'recording', speech_started_at = now() where id = $1 returning speech_started_at",
    [session.id]
  );

  res.json({
    speechStartedAt: updated.rows[0].speech_started_at,
    maxSeconds: config.app.speechMaxSeconds,
    minSeconds: config.app.speechMinSeconds,
  });
});

// Single continuous recording upload. Only accepted once per session — the status
// flip to 'transcribing' below makes a second upload attempt fail as wrong_status,
// which is how multi-blob uploads are rejected.
sessionsRouter.post("/:id/audio", upload.single("file"), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "missing_file" });

  const result = await query(
    "select id, speech_started_at, status from sessions where id = $1 and user_id = $2",
    [req.params.id, req.userId]
  );
  const session = result.rows[0];
  if (!session) return res.status(404).json({ error: "not_found" });
  if (session.status !== "recording") return res.status(409).json({ error: "wrong_status", status: session.status });

  const durationS = Math.round((Date.now() - new Date(session.speech_started_at).getTime()) / 1000);

  if (durationS < config.app.speechMinSeconds) {
    await query("update sessions set status = 'rejected', reject_reason = 'too_short', duration_s = $2 where id = $1", [
      session.id,
      durationS,
    ]);
    return res.status(422).json({ error: "too_short", durationS });
  }
  const uploadGraceSeconds = 30;
  if (durationS > config.app.speechMaxSeconds + uploadGraceSeconds) {
    await query("update sessions set status = 'rejected', reject_reason = 'too_long', duration_s = $2 where id = $1", [
      session.id,
      durationS,
    ]);
    return res.status(422).json({ error: "too_long", durationS });
  }

  const key = audioKeyFor(session.id);
  const audioUrl = await uploadAudio(key, req.file.buffer, req.file.mimetype);

  await query(
    `update sessions
     set status = 'transcribing', duration_s = $2, audio_url = $3, audio_uploaded_at = now()
     where id = $1`,
    [session.id, Math.min(durationS, config.app.speechMaxSeconds), audioUrl]
  );

  await enqueueJob("transcribe", { sessionId: session.id });
  await logEvent(req.userId!, "session_recorded", { sessionId: session.id, durationS });

  res.json({ status: "transcribing" });
});

sessionsRouter.get("/:id/result", async (req: AuthedRequest, res) => {
  const result = await query(
    `select se.status, se.reject_reason, sc.accuracy, sc.coverage, sc.structure, sc.delivery, sc.total,
            sc.missed_points, sc.contradictions, sc.flags
     from sessions se
     left join scores sc on sc.session_id = se.id
     where se.id = $1 and se.user_id = $2`,
    [req.params.id, req.userId]
  );
  const row = result.rows[0];
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ status: row.status, rejectReason: row.reject_reason, score: row.total === null ? null : row });
});
