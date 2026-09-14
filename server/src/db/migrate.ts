import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local dev runs this straight from src/db/ (repo root is 3 levels up); the
// Docker image instead copies db/ next to dist/ (2 levels up from dist/db/).
// Try both rather than hardcoding one layout.
function resolveRoot(): string {
  const candidates = [path.resolve(__dirname, "../../../"), path.resolve(__dirname, "../../")];
  const found = candidates.find((candidate) => existsSync(path.join(candidate, "db/schema.sql")));
  if (!found) throw new Error(`db/schema.sql not found near any of: ${candidates.join(", ")}`);
  return found;
}
const root = resolveRoot();

async function run() {
  const schema = readFileSync(path.join(root, "db/schema.sql"), "utf8");
  await pool.query(schema);
  console.log("schema applied");

  const seedFlag = process.argv.includes("--seed");
  if (seedFlag) {
    const seed = readFileSync(path.join(root, "db/seed.sql"), "utf8");
    await pool.query(seed);
    console.log("seed applied");
  }

  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
