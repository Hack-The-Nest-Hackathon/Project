import { grantPlayerAchievements, listPlayerAchievements, listSaves } from "../database/index.js";
import { achievements, achievementProgress } from "./achievements.js";
import type { Progress } from "./saves.js";

export async function grantQualifiedAchievements(playerId: string, saves?: { progress: Progress }[]) {
  const counts = achievementProgress(saves ?? await listSaves(playerId));
  await grantPlayerAchievements(playerId, achievements.filter(({ metric, threshold }) => counts[metric] >= threshold));
  return counts;
}

export async function syncAchievementAwards(playerId: string) {
  const counts = await grantQualifiedAchievements(playerId);
  const earned = await listPlayerAchievements(playerId);
  const earnedDates = new Map(earned.map(({ achievement_id, earned_at }) => [achievement_id, earned_at]));
  return achievements.map(({ metric, ...achievement }) => ({
    ...achievement,
    progress: counts[metric],
    earnedAt: earnedDates.get(achievement.id)?.toISOString() ?? null,
  }));
}
