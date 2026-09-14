import pg from "pg";
import { config } from "../config.js";

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params: unknown[] = []
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
