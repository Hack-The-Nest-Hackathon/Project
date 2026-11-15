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
  createFriendships: await readFile(new URL("sql/schema/create-game-friendships.sql", import.meta.url), "utf8"),
  indexFriendshipsHigh: await readFile(new URL("sql/schema/create-game-friendships-high-index.sql", import.meta.url), "utf8"),
  listFriends: await readFile(new URL("sql/queries/list-friends.sql", import.meta.url), "utf8"),
  sendFriendRequest: await readFile(new URL("sql/queries/send-friend-request.sql", import.meta.url), "utf8"),
  acceptFriendRequest: await readFile(new URL("sql/queries/accept-friend-request.sql", import.meta.url), "utf8"),
  declineFriendRequest: await readFile(new URL("sql/queries/decline-friend-request.sql", import.meta.url), "utf8"),
  friendsLeaderboard: await readFile(new URL("sql/queries/friends-leaderboard.sql", import.meta.url), "utf8"),
  createAccounts: await readFile(new URL("sql/schema/create-game-accounts.sql", import.meta.url), "utf8"),
  createSessions: await readFile(new URL("sql/schema/create-game-sessions.sql", import.meta.url), "utf8"),
  indexSessionExpiry: await readFile(new URL("sql/schema/create-game-session-expiry-index.sql", import.meta.url), "utf8"),
  createAccountSession: await readFile(new URL("sql/queries/create-account-session.sql", import.meta.url), "utf8"),
  findAccountSession: await readFile(new URL("sql/queries/find-account-session.sql", import.meta.url), "utf8"),
  deleteAccountSession: await readFile(new URL("sql/queries/delete-account-session.sql", import.meta.url), "utf8"),
  deleteExpiredSessions: await readFile(new URL("sql/queries/delete-expired-sessions.sql", import.meta.url), "utf8"),
  createGameSaves: await readFile(new URL("sql/schema/create-game-saves.sql", import.meta.url), "utf8"),
  listSaves: await readFile(new URL("sql/queries/list-saves.sql", import.meta.url), "utf8"),
  upsertSave: await readFile(new URL("sql/queries/upsert-save.sql", import.meta.url), "utf8"),
};

export async function initializeDatabase() {
  await db.query(sql.createAccounts);
  await db.query(sql.createSessions);
  await db.query(sql.indexSessionExpiry);
  await db.query(sql.createGameSaves);
  await db.query(sql.createFriendships);
  await db.query(sql.indexFriendshipsHigh);
}

export async function listSaves(playerId: string) {
  const result = await db.query<{ slot: number; progress: Progress }>(sql.listSaves, [playerId]);
  return result.rows;
}

export async function upsertSave(playerId: string, slot: number, progress: Progress) {
  await db.query(sql.upsertSave, [playerId, slot, progress]);
}


export type Account = { id: string; name: string | null; expiresAt: Date };
export type LoginIdentity = { issuer: string; subject: string; email: string | null; name: string | null };

export async function createAccountSession(
  newId: string, identity: LoginIdentity, tokenHash: string, expiresAt: Date, previousHash: string | null,
) {
  await db.query(sql.deleteExpiredSessions);
  await db.query(sql.createAccountSession, [
    newId, identity.issuer, identity.subject, identity.email, identity.name, tokenHash, expiresAt, previousHash,
  ]);
}

export async function findAccountSession(tokenHash: string) {
  const result = await db.query<Account>(sql.findAccountSession, [tokenHash]);
  return result.rows[0] ?? null;
}

export async function deleteAccountSession(tokenHash: string) {
  await db.query(sql.deleteAccountSession, [tokenHash]);
}

export type Friend = { id: string; name: string; status: "friend" | "incoming" | "sent" };
export type FriendScore = { id: string; name: string; badges: number; clues: number };

export async function getFriends(accountId: string) {
  const [friends, leaderboard] = await Promise.all([
    db.query<Friend>(sql.listFriends, [accountId]),
    db.query<FriendScore>(sql.friendsLeaderboard, [accountId]),
  ]);
  return { friends: friends.rows, leaderboard: leaderboard.rows };
}

export async function updateFriendship(accountId: string, friendId: string, action: "send" | "accept" | "decline") {
  const statements = { send: sql.sendFriendRequest, accept: sql.acceptFriendRequest, decline: sql.declineFriendRequest };
  const result = await db.query(statements[action], [accountId, friendId]);
  return Boolean(result.rowCount);
}
