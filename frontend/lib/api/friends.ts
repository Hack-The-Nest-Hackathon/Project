import { request } from "./client";

export type Friend = { id: string; name: string; status: "friend" | "incoming" | "sent" };
export type FriendScore = { id: string; name: string; badges: number; clues: number };
export type FriendsData = { friends: Friend[]; leaderboard: FriendScore[] };
export type FriendAction = "send" | "accept" | "decline";

export const loadFriends = (accountId: string, signal: AbortSignal) =>
  request<FriendsData>("friends", { signal, cache: "no-store", headers: { "x-account-id": accountId } });

export const updateFriend = (accountId: string, friendId: string, action: FriendAction, signal: AbortSignal) =>
  request<void>("friends", { method: "POST", headers: { "x-account-id": accountId }, json: { friendId, action }, signal });
