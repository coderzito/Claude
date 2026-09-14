import { Router } from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import { z } from "zod";
import { query } from "../db/pool.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { extractSubtopicsFromSyllabus } from "../services/generation.js";

export const decksRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

decksRouter.use(requireAuth);

// Deck picker: three seeded decks plus anything the user uploaded.
decksRouter.get("/", async (req: AuthedRequest, res) => {
  const result = await query(
    `select id, title, subject, source_type, visibility, created_at
     from decks
     where source_type = 'seeded' or owner_id = $1
     order by source_type desc, created_at asc`,
    [req.userId]
  );
  res.json({ decks: result.rows });
});

decksRouter.get("/:deckId/subtopics", async (req: AuthedRequest, res) => {
  const result = await query(
    "select id, title, difficulty_tier, times_rolled from subtopics where deck_id = $1 order by title",
    [req.params.deckId]
  );
  res.json({ subtopics: result.rows });
});

// Syllabus upload: PDF or plain text in, subtopics out (via one LLM extraction call).
decksRouter.post("/syllabus", upload.single("file"), async (req: AuthedRequest, res) => {
  const titleSchema = z.object({ title: z.string().min(1).max(120) });
  const parsedTitle = titleSchema.safeParse(req.body);
  if (!parsedTitle.success) return res.status(400).json({ error: "missing_title" });

  let text: string;
  if (req.file) {
    if (req.file.mimetype === "application/pdf") {
      const parsed = await pdfParse(req.file.buffer);
      text = parsed.text;
    } else {
      text = req.file.buffer.toString("utf8");
    }
  } else if (typeof req.body.text === "string" && req.body.text.trim()) {
    text = req.body.text;
  } else {
    return res.status(400).json({ error: "missing_file_or_text" });
  }

  const extracted = await extractSubtopicsFromSyllabus(text);

  const deckResult = await query<{ id: string }>(
    `insert into decks (owner_id, title, subject, source_type, visibility)
     values ($1, $2, $3, 'syllabus', 'private') returning id`,
    [req.userId, parsedTitle.data.title, extracted.subject]
  );
  const deckId = deckResult.rows[0].id;
  await query("insert into deck_configs (deck_id) values ($1)", [deckId]);

  for (const s of extracted.subtopics) {
    await query("insert into subtopics (deck_id, title, difficulty_tier) values ($1, $2, $3)", [
      deckId,
      s.title,
      s.difficulty_tier,
    ]);
  }

  res.status(201).json({ deckId, subject: extracted.subject, subtopicCount: extracted.subtopics.length });
});

// Roll: pick a random subtopic from the chosen deck.
decksRouter.post("/:deckId/roll", async (req: AuthedRequest, res) => {
  const result = await query<{ id: string; title: string; difficulty_tier: string }>(
    `select id, title, difficulty_tier from subtopics where deck_id = $1 order by random() limit 1`,
    [req.params.deckId]
  );
  const subtopic = result.rows[0];
  if (!subtopic) return res.status(404).json({ error: "deck_empty" });

  await query("update subtopics set times_rolled = times_rolled + 1 where id = $1", [subtopic.id]);
  res.json({ subtopic });
});
