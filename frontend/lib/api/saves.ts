import { request } from "./client";
import { isCharacter, type Character } from "../character";

export type Progress = { planet: string; observed: string[]; badges: string[]; character?: Character };

export function isProgress(value: unknown): value is Progress {
  if (!value || typeof value !== "object") return false;
  const { planet, observed, badges, character } = value as Partial<Progress>;
  const isStringArray = (items: unknown) => Array.isArray(items) && items.every((item) => typeof item === "string");
  return typeof planet === "string" && isStringArray(observed) && isStringArray(badges)
    && (character === undefined || isCharacter(character));
}

export async function loadSaves(key: string, signal: AbortSignal) {
  const saves = await request<{ slot: number; progress: unknown }[]>("saves", {
    headers: { "x-save-key": key }, timeout: 4_000, signal,
  });
  const slots: Partial<Record<number, Progress>> = {};
  for (const { slot, progress } of saves) {
    if (slot >= 1 && slot <= 3 && isProgress(progress)) slots[slot] = progress;
  }
  return slots;
}

export function saveProgress(key: string, slot: number, progress: Progress) {
  return request<void>(`saves/${slot}`, {
    method: "PUT", headers: { "x-save-key": key }, json: progress, timeout: 4_000,
  });
}
