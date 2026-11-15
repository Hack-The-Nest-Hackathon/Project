import { request } from "./client";
import { isCharacter, type Character } from "../character";
import { isNasaPhoto, type NasaPhoto } from "./photos";

export type Progress = {
  planet: string; observed: string[]; badges: string[]; visited?: string[]; character?: Character; photos?: NasaPhoto[];
};

export function isProgress(value: unknown): value is Progress {
  if (!value || typeof value !== "object") return false;
  const { planet, observed, badges, visited, character, photos } = value as Partial<Progress>;
  const isStringArray = (items: unknown) => Array.isArray(items) && items.every((item) => typeof item === "string");
  return typeof planet === "string" && isStringArray(observed) && isStringArray(badges)
    && (visited === undefined || isStringArray(visited))
    && (character === undefined || isCharacter(character))
    && (photos === undefined || (Array.isArray(photos) && photos.every(isNasaPhoto)));
}

export async function loadSaves(accountId: string, signal: AbortSignal) {
  const saves = await request<{ slot: number; progress: unknown }[]>("saves", {
    headers: { "x-account-id": accountId }, timeout: 4_000, signal,
  });
  const slots: Partial<Record<number, Progress>> = {};
  for (const { slot, progress } of saves) {
    if (slot >= 1 && slot <= 3 && isProgress(progress)) slots[slot] = progress;
  }
  return slots;
}

export function saveProgress(accountId: string, slot: number, progress: Progress, signal: AbortSignal) {
  return request<void>(`saves/${slot}`, {
    method: "PUT", headers: { "x-account-id": accountId }, json: progress, timeout: 8_000, signal,
  });
}
