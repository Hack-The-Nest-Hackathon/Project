import { lines, world } from "./world.js";
import { isNasaImageUrl, type NasaPhoto } from "./nasa.js";

export type Character = {
  name: string; skin: number; hair: number; hairColor: number; suit: number; accessory: number;
};

export type Progress = { planet: string; observed: string[]; badges: string[]; character?: Character; photos?: NasaPhoto[] };

const appearanceIndex = { type: "integer", minimum: 0, maximum: 5 };
export const characterSchema = {
  type: "object", additionalProperties: false,
  required: ["name", "skin", "hair", "hairColor", "suit", "accessory"],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 24, pattern: "\\S" },
    skin: appearanceIndex, hair: appearanceIndex, hairColor: appearanceIndex,
    suit: appearanceIndex, accessory: appearanceIndex,
  },
};

const planets = new Map(world.map(({ id, requiredBadges }) => [id, requiredBadges]));

export function isValidProgress({ planet, observed, badges, photos = [] }: Progress) {
  const requiredBadges = planets.get(planet);
  return requiredBadges !== undefined
    && badges.length >= requiredBadges
    && badges.every((badge) => planets.has(badge))
    && observed.every((clue) => lines.has(clue))
    && new Set(photos.map((photo) => photo.sceneId)).size === photos.length
    && photos.every((photo) => badges.includes(photo.sceneId) && isNasaImageUrl(photo.imageUrl));
}
