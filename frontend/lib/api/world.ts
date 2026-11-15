import { request } from "./client";

export type Clue = { id: string; speaker: string; context: string; phrase: string; pronunciation?: string };
export type Scene = {
  id: string;
  title: string;
  language: string;
  description: string;
  requiredBadges: number;
  clues: Clue[];
  questions: { prompt: string; options: string[]; phrase?: string; pronunciation?: string }[];
};

export const getWorld = (signal: AbortSignal) => request<Scene[]>("world", { signal });

export function getHint(sceneId: string, observedClueIds: string[], signal: AbortSignal) {
  return request<{ hint: string; evidenceIds: string[]; source: "scripted" }>("hint", {
    method: "POST", json: { sceneId, observedClueIds }, signal,
  });
}

export function submitAnswer(sceneId: string, choices: number[], signal: AbortSignal) {
  return request<{ correct: boolean; score: number; total: number }>("answer", { method: "POST", json: { sceneId, choices }, signal });
}
