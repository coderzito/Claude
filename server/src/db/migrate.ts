import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../../");

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
