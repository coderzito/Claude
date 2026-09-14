import { query } from "../db/pool.js";
import { config } from "../config.js";
import { generateChapter, type KeyPoint } from "./generation.js";

export interface Chapter {
  id: string;
  subtopic_id: string;
  body_md: string;
  key_points: KeyPoint[];
  model_version: string;
  cached_at: string;
}

/**
 * Chapters are cached per (subtopic, model_version) and reused across every
 * user who rolls that subtopic. Regenerated only when MODEL_VERSION changes —
 * never to "refresh" content, since that would be a second generation call
 * and key points would drift from a body they no longer match.
 */
export async function getOrCreateChapter(subtopicId: string): Promise<Chapter> {
  const cached = await query<Chapter>(
    "select * from chapters where subtopic_id = $1 and model_version = $2",
    [subtopicId, config.groq.modelVersion]
  );
  if (cached.rows[0]) return cached.rows[0];

  const subtopicRes = await query<{ title: string; difficulty_tier: string; deck_subject: string }>(
    `select s.title, s.difficulty_tier, d.subject as deck_subject
     from subtopics s join decks d on d.id = s.deck_id
     where s.id = $1`,
    [subtopicId]
  );
  const subtopic = subtopicRes.rows[0];
  if (!subtopic) throw new Error("subtopic_not_found");

  const generated = await generateChapter(subtopic.deck_subject, subtopic.title, subtopic.difficulty_tier);

  const inserted = await query<Chapter>(
    `insert into chapters (subtopic_id, body_md, key_points, model_version)
     values ($1, $2, $3, $4)
     on conflict (subtopic_id, model_version) do update set body_md = excluded.body_md
     returning *`,
    [subtopicId, generated.body_md, JSON.stringify(generated.key_points), config.groq.modelVersion]
  );
  return inserted.rows[0];
}
