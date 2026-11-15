import { request } from "./client";

export type Clue = {
  id: string; speaker: string; context: string; phrase: string; pronunciation?: string;
  translation?: string; glosses?: string[];
  roles?: string[];
  observation?: { label: string; prop: "apple" | "bread" | "lantern" | "marker"; count: number; action: "show" | "load" | "carry" | "see" };
};
export type Scene = {
  id: string;
  title: string;
  language: string;
  dialect?: string;
  description: string;
  requiredBadges: number;
  clues: Clue[];
  questions: { prompt: string; options: string[]; phrase?: string; pronunciation?: string; audioId?: string; glosses?: (string | null)[] }[];
};

export const getWorld = (signal: AbortSignal) => request<Scene[]>("world", { signal });

export function getHint(sceneId: string, observedClueIds: string[], signal: AbortSignal) {
  return request<{ hint: string; evidenceIds: string[]; source: "scripted" }>("hint", {
    method: "POST", json: { sceneId, observedClueIds }, signal,
  });
}

export type QuizResult = {
  correct: boolean; score: number; total: number;
  missed: { index: number; selected: number; answer: number }[];
};

export function submitAnswer(sceneId: string, choices: number[], signal: AbortSignal) {
  return request<QuizResult>("answer", { method: "POST", json: { sceneId, choices }, signal });
}
