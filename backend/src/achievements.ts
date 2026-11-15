import { scenes } from "./world.js";
import type { Progress } from "./saves.js";

export const achievements = [
  { id: "badge-first", title: "First Discovery", description: "Earn your first badge.", metric: "badges", threshold: 1, stickerId: "rocket", stickerName: "Rocket" },
  { id: "badge-five", title: "Badge Collector", description: "Earn badges on 5 different worlds.", metric: "badges", threshold: 5, stickerId: "red-planet", stickerName: "Ringed Planet" },
  { id: "badge-ten", title: "Star Cartographer", description: "Earn badges on 10 different worlds.", metric: "badges", threshold: 10, stickerId: "star", stickerName: "Bright Star" },
  { id: "visit-three", title: "Interplanetary Traveler", description: "Land on 3 different worlds.", metric: "places", threshold: 3, stickerId: "nasa-patch", stickerName: "Mission Patch" },
  { id: "visit-ten", title: "Deep Space Explorer", description: "Land on 10 different worlds.", metric: "places", threshold: 10, stickerId: "meteor", stickerName: "Meteor" },
  { id: "character-three", title: "First Contacts", description: "Collect a clue from 3 different characters.", metric: "characters", threshold: 3, stickerId: "moon", stickerName: "Moon" },
  { id: "character-eight", title: "Cosmic Crew", description: "Collect a clue from 8 different characters.", metric: "characters", threshold: 8, stickerId: "shooting-star", stickerName: "Shooting Star" },
  { id: "character-fifteen", title: "Galactic Diplomat", description: "Collect a clue from 15 different characters.", metric: "characters", threshold: 15, stickerId: "blue-planet", stickerName: "Blue Planet" },
] as const;

type Save = { progress: Progress };

const knownWorlds = new Set(scenes.map(({ id }) => id));
const clueCharacters = new Map<string, { sceneId: string; character: string }>();
for (const scene of scenes) {
  for (const clue of scene.clues) clueCharacters.set(clue.id, { sceneId: scene.id, character: `${scene.id}:${clue.speaker}` });
}

export function achievementProgress(saves: Save[]) {
  const badges = new Set<string>();
  const places = new Set<string>();
  const characters = new Set<string>();

  for (const { progress } of saves) {
    for (const badge of progress.badges) {
      if (!knownWorlds.has(badge)) continue;
      badges.add(badge);
      places.add(badge);
    }
    for (const place of progress.visited ?? []) {
      if (knownWorlds.has(place)) places.add(place);
    }
    // Older saves recorded the current destination without a visit history.
    if (!progress.visited && progress.planet !== "market" && knownWorlds.has(progress.planet)) {
      places.add(progress.planet);
    }
    for (const clue of progress.observed) {
      const contact = clueCharacters.get(clue);
      if (!contact) continue;
      characters.add(contact.character);
      places.add(contact.sceneId);
    }
  }

  return { badges: badges.size, places: places.size, characters: characters.size };
}
