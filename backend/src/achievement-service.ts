import { grantPlayerAchievements, listPlayerAchievements, listSaves } from "../database/index.js";
import { achievements, qualifiedAchievements } from "./achievements.js";
import type { Progress } from "./saves.js";

const achievementById = new Map(achievements.map((achievement) => [achievement.id, achievement]));

export async function grantQualifiedAchievements(playerId: string, saves?: { progress: Progress }[]) {
  const playerSaves = saves ?? await listSaves(playerId);
  const qualified = qualifiedAchievements(playerSaves);
  await grantPlayerAchievements(playerId, qualified);
}

export async function syncAchievementAwards(playerId: string, saves?: { progress: Progress }[]) {
  await grantQualifiedAchievements(playerId, saves);
  const earned = await listPlayerAchievements(playerId);
  return earned.map(({ achievement_id, earned_at }) => {
    const achievement = achievementById.get(achievement_id);
    if (!achievement) throw new Error(`Unknown stored achievement: ${achievement_id}`);
    return {
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      stickerId: achievement.stickerId,
      stickerName: achievement.stickerName,
      earnedAt: earned_at.toISOString(),
    };
  });
}
