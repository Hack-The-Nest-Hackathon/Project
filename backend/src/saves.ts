import { lines, world } from "./world.js";

export type Character = {
  name: string; skin: number; hair: number; hairColor: number; suit: number; accessory: number;
};

export type Progress = { planet: string; observed: string[]; badges: string[]; character?: Character };

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

export type SaveHeaders = { "x-save-key": string };

const planets = new Map(world.map(({ id, requiredBadges }) => [id, requiredBadges]));

export function isValidProgress({ planet, observed, badges }: Progress) {
  const requiredBadges = planets.get(planet);
  return requiredBadges !== undefined
    && badges.length >= requiredBadges
    && badges.every((badge) => planets.has(badge))
    && observed.every((clue) => lines.has(clue));
}

export const saveHeaders = {
  type: "object",
  required: ["x-save-key"],
  properties: {
    "x-save-key": { type: "string", pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$" },
  },
};
