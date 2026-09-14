import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import type { KeyPoint } from "./generation.js";

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

export interface KeyPointHit {
  id: string;
  hit: boolean;
  evidence: string;
}

export interface Contradiction {
  claim: string;
  source_line: number;
}

export interface GradingResult {
  accuracy: number;
  structure: number;
  delivery: number;
  key_points: KeyPointHit[];
  contradictions: Contradiction[];
}

const gradingTool: Anthropic.Tool = {
  name: "emit_grade",
  description: "Grade a spoken explanation against the chapter's key points.",
  input_schema: {
    type: "object",
    properties: {
      accuracy: { type: "integer", minimum: 0, maximum: 100, description: "How factually correct the claims made were, independent of coverage" },
      structure: { type: "integer", minimum: 0, maximum: 100, description: "How logically organized the explanation was" },
      delivery: { type: "integer", minimum: 0, maximum: 100, description: "Clarity, pacing, confidence of the spoken delivery" },
      key_points: {
        type: "array",
        description: "One entry per key point id given, in the same order, saying whether it was covered.",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            hit: { type: "boolean" },
            evidence: { type: "string", description: "Quote or paraphrase from the transcript, or empty string if not hit" },
          },
          required: ["id", "hit", "evidence"],
        },
      },
      contradictions: {
        type: "array",
        description: "Claims in the transcript that directly contradict the source chapter.",
        items: {
          type: "object",
          properties: {
            claim: { type: "string" },
            source_line: { type: "integer" },
          },
          required: ["claim", "source_line"],
        },
      },
    },
    required: ["accuracy", "structure", "delivery", "key_points", "contradictions"],
  },
};

/**
 * Coverage is intentionally NOT requested from the model — it's computed
 * deterministically from key_points hits and weights, so it can't drift from
 * the structured data the chapter was generated with.
 */
export async function gradeTranscript(chapterBodyMd: string, keyPoints: KeyPoint[], transcript: string): Promise<GradingResult> {
  const message = await client.messages.create({
    model: config.anthropic.generationModel,
    max_tokens: 4096,
    tools: [gradingTool],
    tool_choice: { type: "tool", name: "emit_grade" },
    messages: [
      {
        role: "user",
        content:
          `Source chapter:\n${chapterBodyMd}\n\n` +
          `Key points the speaker should have covered:\n${JSON.stringify(keyPoints.map((k) => ({ id: k.id, claim: k.claim })))}\n\n` +
          `Spoken explanation transcript:\n${transcript}\n\n` +
          `Grade the transcript against the chapter. For each key point id above, say whether it was covered (hit) with supporting evidence from the transcript. ` +
          `Flag any contradictions of the source chapter with the source_line they conflict with. Call emit_grade.`,
      },
    ],
  });

  const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) throw new Error("grading_no_tool_use");
  return toolUse.input as GradingResult;
}

export interface DeckWeights {
  accuracy_weight: number;
  coverage_weight: number;
  structure_weight: number;
  delivery_weight: number;
}

export function computeCoverage(keyPoints: KeyPoint[], hits: KeyPointHit[]): number {
  const totalWeight = keyPoints.reduce((sum, kp) => sum + kp.weight, 0);
  if (totalWeight === 0) return 0;
  const hitById = new Map(hits.map((h) => [h.id, h.hit]));
  const earned = keyPoints.reduce((sum, kp) => sum + (hitById.get(kp.id) ? kp.weight : 0), 0);
  return Math.round((earned / totalWeight) * 100);
}

export function computeTotal(scores: { accuracy: number; coverage: number; structure: number; delivery: number }, weights: DeckWeights): number {
  const weightSum = weights.accuracy_weight + weights.coverage_weight + weights.structure_weight + weights.delivery_weight;
  const weighted =
    scores.accuracy * weights.accuracy_weight +
    scores.coverage * weights.coverage_weight +
    scores.structure * weights.structure_weight +
    scores.delivery * weights.delivery_weight;
  return Math.round((weighted / weightSum) * 10) / 10;
}
