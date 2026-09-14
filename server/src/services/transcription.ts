import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { config } from "../config.js";

const client = new OpenAI({ apiKey: config.groq.apiKey, baseURL: config.groq.baseUrl });

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
}

export async function transcribeAudio(buffer: Buffer, filename: string): Promise<TranscriptionResult> {
  const file = await toFile(buffer, filename);
  const response = await client.audio.transcriptions.create({
    file,
    model: config.groq.transcriptionModel,
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  const verbose = response as unknown as { text: string; segments?: TranscriptSegment[] };
  return {
    text: verbose.text,
    segments: (verbose.segments ?? []).map((s) => ({ start: s.start, end: s.end, text: s.text })),
  };
}

const FILLER_WORDS = ["um", "uh", "er", "ah", "like", "you know", "i mean", "sort of", "kind of"];

/**
 * Flags likely script-reading: unnaturally low pause variance combined with
 * unnaturally low filler rate. Per the brief this only flags in v1 — it never
 * auto-penalizes the score.
 */
export function detectScriptReading(segments: TranscriptSegment[], transcriptText: string): { flagged: boolean; pauseVarianceMs: number; fillerRatePer100Words: number } {
  const pauses: number[] = [];
  for (let i = 1; i < segments.length; i++) {
    const gap = segments[i].start - segments[i - 1].end;
    if (gap > 0) pauses.push(gap * 1000);
  }
  const meanPause = pauses.length ? pauses.reduce((a, b) => a + b, 0) / pauses.length : 0;
  const pauseVarianceMs = pauses.length
    ? pauses.reduce((sum, p) => sum + (p - meanPause) ** 2, 0) / pauses.length
    : 0;

  const words = transcriptText.toLowerCase().split(/\s+/).filter(Boolean);
  const wordCount = Math.max(words.length, 1);
  const lowerText = transcriptText.toLowerCase();
  const fillerCount = FILLER_WORDS.reduce((count, filler) => {
    const matches = lowerText.match(new RegExp(`\\b${filler}\\b`, "g"));
    return count + (matches?.length ?? 0);
  }, 0);
  const fillerRatePer100Words = (fillerCount / wordCount) * 100;

  // Natural speech has noisy pause timing and at least a few disfluencies over a
  // multi-minute explanation; both being unusually low together suggests reading.
  const flagged = pauses.length >= 3 && pauseVarianceMs < 15_000 && fillerRatePer100Words < 0.5;

  return { flagged, pauseVarianceMs, fillerRatePer100Words };
}
