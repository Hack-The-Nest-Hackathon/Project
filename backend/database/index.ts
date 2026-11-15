import pg from "pg";
import { readFile } from "node:fs/promises";
import type { Progress } from "../src/saves.js";

const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
  connectionTimeoutMillis: 3_000,
  statement_timeout: 4_000,
});
db.on("error", (error) => console.error("Idle PostgreSQL connection failed", error.name));

const sql = {
  createGameSaves: await readFile(new URL("sql/schema/create-game-saves.sql", import.meta.url), "utf8"),
  listSaves: await readFile(new URL("sql/queries/list-saves.sql", import.meta.url), "utf8"),
  upsertSave: await readFile(new URL("sql/queries/upsert-save.sql", import.meta.url), "utf8"),
};

export async function initializeDatabase() {
  await db.query(sql.createGameSaves);
}

export async function listSaves(playerId: string) {
  const result = await db.query<{ slot: number; progress: Progress }>(sql.listSaves, [playerId]);
  return result.rows;
}

export async function upsertSave(playerId: string, slot: number, progress: Progress) {
  await db.query(sql.upsertSave, [playerId, slot, progress]);
}
