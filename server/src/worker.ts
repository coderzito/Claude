import { pool, query } from "./db/pool.js";
import { fetchAudioBuffer, audioKeyFor } from "./lib/storage.js";
import { transcribeAudio, detectScriptReading } from "./services/transcription.js";
import { gradeTranscript, computeCoverage, computeTotal, type DeckWeights } from "./services/grading.js";
import { enqueueJob } from "./services/jobs.js";
import { recordCompletedSession } from "./services/streaks.js";
import { logEvent } from "./lib/analytics.js";
import type { KeyPoint } from "./services/generation.js";

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 3;

interface Job {
  id: string;
  type: "transcribe" | "grade";
  payload: { sessionId: string };
  attempts: number;
}

async function claimNextJob(): Promise<Job | null> {
  const result = await query<Job>(
    `update jobs set status = 'processing', attempts = attempts + 1, updated_at = now()
     where id = (
       select id from jobs
       where status = 'pending' and run_after <= now()
       order by created_at
       limit 1
       for update skip locked
     )
     returning id, type, payload, attempts`
  );
  return result.rows[0] ?? null;
}

async function completeJob(id: string) {
  await query("update jobs set status = 'done', updated_at = now() where id = $1", [id]);
}

async function failJob(job: Job, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`job ${job.id} (${job.type}) failed:`, message);
  if (job.attempts >= MAX_ATTEMPTS) {
    await query("update jobs set status = 'failed', error = $2, updated_at = now() where id = $1", [job.id, message]);
  } else {
    // simple backoff: retry after attempts^2 * 10s
    await query(
      "update jobs set status = 'pending', error = $2, run_after = now() + ($3 || ' seconds')::interval, updated_at = now() where id = $1",
      [job.id, message, String(job.attempts * job.attempts * 10)]
    );
  }
}

async function processTranscribe(job: Job) {
  const { sessionId } = job.payload;
  const sessionRes = await query<{ id: string }>("select id from sessions where id = $1 and status = 'transcribing'", [
    sessionId,
  ]);
  if (!sessionRes.rows[0]) return; // already handled or session was rejected

  const buffer = await fetchAudioBuffer(audioKeyFor(sessionId));
  const { text, segments } = await transcribeAudio(buffer, `${sessionId}.m4a`);

  await query("update sessions set transcript = $2, transcript_segments = $3, status = 'grading' where id = $1", [
    sessionId,
    text,
    JSON.stringify(segments),
  ]);

  await enqueueJob("grade", { sessionId });
}

async function processGrade(job: Job) {
  const { sessionId } = job.payload;
  const sessionRes = await query<{
    id: string;
    user_id: string;
    transcript: string;
    transcript_segments: { start: number; end: number; text: string }[];
    body_md: string;
    key_points: KeyPoint[];
    accuracy_weight: number;
    coverage_weight: number;
    structure_weight: number;
    delivery_weight: number;
  }>(
    `select se.id, se.user_id, se.transcript, se.transcript_segments, ch.body_md, ch.key_points,
            dc.accuracy_weight, dc.coverage_weight, dc.structure_weight, dc.delivery_weight
     from sessions se
     join chapters ch on ch.id = se.chapter_id
     join subtopics sub on sub.id = se.subtopic_id
     join deck_configs dc on dc.deck_id = sub.deck_id
     where se.id = $1 and se.status = 'grading'`,
    [sessionId]
  );
  const session = sessionRes.rows[0];
  if (!session) return;

  const graded = await gradeTranscript(session.body_md, session.key_points, session.transcript);
  const coverage = computeCoverage(session.key_points, graded.key_points);
  const weights: DeckWeights = {
    accuracy_weight: session.accuracy_weight,
    coverage_weight: session.coverage_weight,
    structure_weight: session.structure_weight,
    delivery_weight: session.delivery_weight,
  };
  const total = computeTotal(
    { accuracy: graded.accuracy, coverage, structure: graded.structure, delivery: graded.delivery },
    weights
  );

  const missedPoints = session.key_points
    .filter((kp) => !graded.key_points.find((h) => h.id === kp.id)?.hit)
    .map((kp) => ({ id: kp.id, claim: kp.claim, source_line: kp.source_line }));

  const scriptFlag = detectScriptReading(session.transcript_segments ?? [], session.transcript);

  await query(
    `insert into scores (session_id, accuracy, coverage, structure, delivery, total, missed_points, contradictions, key_point_hits, flags)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      sessionId,
      graded.accuracy,
      coverage,
      graded.structure,
      graded.delivery,
      total,
      JSON.stringify(missedPoints),
      JSON.stringify(graded.contradictions),
      JSON.stringify(graded.key_points),
      JSON.stringify({ likelyScriptReading: scriptFlag.flagged, ...scriptFlag }),
    ]
  );

  await query("update sessions set status = 'scored' where id = $1", [sessionId]);
  await recordCompletedSession(session.user_id);
  await logEvent(session.user_id, "session_scored", { sessionId, total });
}

async function tick() {
  const job = await claimNextJob();
  if (!job) return;
  try {
    if (job.type === "transcribe") await processTranscribe(job);
    else if (job.type === "grade") await processGrade(job);
    await completeJob(job.id);
  } catch (err) {
    await failJob(job, err);
  }
}

async function main() {
  console.log("passion-study worker started");
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await tick();
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});
