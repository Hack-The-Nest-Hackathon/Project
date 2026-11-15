import { scenes } from "./world.js";
import type { Progress } from "./saves.js";

export const achievements = [
  { id: "badge-first", title: "First Discovery", description: "Earn your first badge.", metric: "badges", threshold: 1, stickerId: "rocket", stickerName: "Rocket" },
  { id: "badge-five", title: "Badge Collector", description: "Earn 5 badges.", metric: "badges", threshold: 5, stickerId: "red-planet", stickerName: "Ringed Planet" },
  { id: "badge-ten", title: "Star Cartographer", description: "Earn 10 badges.", metric: "badges", threshold: 10, stickerId: "star", stickerName: "Bright Star" },
  { id: "visit-three", title: "Interplanetary Traveler", description: "Visit 3 places.", metric: "places", threshold: 3, stickerId: "nasa-patch", stickerName: "NASA Mission Patch" },
  { id: "visit-ten", title: "Deep Space Explorer", description: "Visit 10 places.", metric: "places", threshold: 10, stickerId: "meteor", stickerName: "Meteor" },
  { id: "character-three", title: "First Contacts", description: "Interact with 3 characters.", metric: "characters", threshold: 3, stickerId: "moon", stickerName: "Moon" },
  { id: "character-eight", title: "Cosmic Crew", description: "Interact with 8 characters.", metric: "characters", threshold: 8, stickerId: "shooting-star", stickerName: "Shooting Star" },
  { id: "character-fifteen", title: "Galactic Diplomat", description: "Interact with 15 characters.", metric: "characters", threshold: 15, stickerId: "blue-planet", stickerName: "Blue Planet" },
] as const;

type Save = { progress: Progress };

const clueCharacters = new Map<string, string>();
for (const scene of scenes) {
  for (const clue of scene.clues) clueCharacters.set(clue.id, `${scene.id}:${clue.speaker}`);
}

export function qualifiedAchievements(saves: Save[]) {
  const badges = new Set<string>();
  const places = new Set<string>();
  const characters = new Set<string>();

  for (const { progress } of saves) {
    for (const badge of progress.badges) badges.add(badge);
    for (const place of progress.visited ?? []) places.add(place);
    for (const badge of progress.badges) places.add(badge);
    places.add(progress.planet);
    for (const clue of progress.observed) {
      const character = clueCharacters.get(clue);
      if (character) characters.add(character);
    }
  }

  const counts = { badges: badges.size, places: places.size, characters: characters.size };
  return achievements.filter(({ metric, threshold }) => counts[metric] >= threshold);
}
