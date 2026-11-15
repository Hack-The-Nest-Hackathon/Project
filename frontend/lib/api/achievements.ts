import { request } from "./client";

export type StickerAchievement = {
  id: string;
  title: string;
  description: string;
  stickerId: string;
  stickerName: string;
  threshold: number;
  progress: number;
  earnedAt: string | null;
};

export function getAchievements(accountId: string, signal: AbortSignal) {
  return request<StickerAchievement[]>("achievements", {
    headers: { "x-account-id": accountId }, signal,
  });
}
