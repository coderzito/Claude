import { query } from "../db/pool.js";

export async function enqueueJob(type: "transcribe" | "grade", payload: Record<string, unknown>): Promise<void> {
  await query("insert into jobs (type, payload) values ($1, $2)", [type, JSON.stringify(payload)]);
}
