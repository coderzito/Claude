import OpenAI from "openai";
import { config } from "../config.js";

const client = new OpenAI({ apiKey: config.groq.apiKey, baseURL: config.groq.baseUrl });

export interface KeyPoint {
  id: string;
  claim: string;
  weight: number;
  source_line: number;
}

export interface GeneratedChapter {
  body_md: string;
  key_points: KeyPoint[];
}

const chapterTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "emit_chapter",
    description: "Return the generated study chapter and its structured key points together.",
    parameters: {
      type: "object",
      properties: {
        body_md: {
          type: "string",
          description:
            "The chapter body in markdown. Number each paragraph's content so source_line references make sense; " +
            "write it as plain prose lines, one idea per line where practical, so line numbers map cleanly to claims.",
        },
        key_points: {
          type: "array",
          description: "Every claim a correct spoken explanation must cover.",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              claim: { type: "string" },
              weight: { type: "integer", minimum: 1, maximum: 5 },
              source_line: { type: "integer", description: "1-indexed line number in body_md this claim comes from" },
            },
            required: ["id", "claim", "weight", "source_line"],
          },
        },
      },
      required: ["body_md", "key_points"],
    },
  },
};

function extractToolArgs<T>(completion: OpenAI.Chat.Completions.ChatCompletion, toolName: string): T {
  const toolCall = completion.choices[0]?.message?.tool_calls?.find(
    (t): t is OpenAI.Chat.Completions.ChatCompletionMessageToolCall & { function: { name: string } } =>
      t.function.name === toolName
  );
  if (!toolCall) throw new Error(`${toolName}_no_tool_call`);
  return JSON.parse(toolCall.function.arguments) as T;
}

/**
 * One call per subtopic produces both the chapter and its key points, because a
 * second call would let them drift and the grader would mark correct answers wrong.
 * Callers are responsible for caching the result (see routes/chapters.ts).
 */
export async function generateChapter(deckSubject: string, subtopicTitle: string, difficultyTier: string): Promise<GeneratedChapter> {
  const completion = await client.chat.completions.create({
    model: config.groq.generationModel,
    max_tokens: 4096,
    tools: [chapterTool],
    tool_choice: { type: "function", function: { name: "emit_chapter" } },
    messages: [
      {
        role: "user",
        content:
          `Write a ${difficultyTier}-level study chapter (400-700 words) on "${subtopicTitle}" within the subject "${deckSubject}". ` +
          `Number the body's lines (prefix each line "1: ", "2: ", ...) so key points can cite an exact source_line. ` +
          `Then extract every key point a student's spoken explanation should cover, each tied to the exact line it came from. ` +
          `Weight key points 1-5 by importance. Call emit_chapter with both.`,
      },
    ],
  });

  const result = extractToolArgs<GeneratedChapter>(completion, "emit_chapter");
  if (!result.body_md || !Array.isArray(result.key_points)) throw new Error("generation_malformed_output");
  return result;
}

const subtopicsTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "emit_subtopics",
    description: "Return a list of study subtopics extracted from the syllabus.",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string" },
        subtopics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              difficulty_tier: { type: "string", enum: ["intro", "core", "advanced"] },
            },
            required: ["title", "difficulty_tier"],
          },
        },
      },
      required: ["subject", "subtopics"],
    },
  },
};

export interface ExtractedSubtopic {
  title: string;
  difficulty_tier: "intro" | "core" | "advanced";
}

export async function extractSubtopicsFromSyllabus(syllabusText: string): Promise<{ subject: string; subtopics: ExtractedSubtopic[] }> {
  const truncated = syllabusText.slice(0, 20000);
  const completion = await client.chat.completions.create({
    model: config.groq.generationModel,
    max_tokens: 2048,
    tools: [subtopicsTool],
    tool_choice: { type: "function", function: { name: "emit_subtopics" } },
    messages: [
      {
        role: "user",
        content:
          "Read this syllabus and extract 8-20 discrete, rollable study subtopics (not whole units) with a difficulty tier each. " +
          "Also infer a short subject name.\n\n" +
          truncated,
      },
    ],
  });

  return extractToolArgs<{ subject: string; subtopics: ExtractedSubtopic[] }>(completion, "emit_subtopics");
}
