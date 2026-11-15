import { request } from "./client";

export type Clue = {
  id: string; speaker: string; context: string; phrase: string; pronunciation?: string;
  translation?: string; glosses?: string[];
  opening?: { npc: string; player: string; question: string; bridge: string; speak?: string };
  roles?: string[];
  followUp?: { id: string; phrase: string; pronunciation?: string; translation: string; prompt: string; promptAudioId?: string; alternatives: string[]; glosses?: string[]; roles?: string[] };
  replies?: { id: string; phrase: string; pronunciation?: string; translation: string; glosses?: string[]; roles: string[]; choice: string; prompt: string; promptAudioId?: string; acknowledgment: string; acknowledgmentAudioId?: string }[];
  practice?: { id: string; word: string; pronunciation?: string }[];
  observation?: { label: string; prop: "apple" | "bread" | "lantern" | "marker" | "crate"; count: number; action: "show" | "load" | "carry" | "see" };
};
export type Scene = {
  id: string;
  title: string;
  language: string;
  region?: "harbor" | "highland" | "dune";
  description: string;
  requiredBadges: number;
  audioRevision?: string;
  mission?: { briefing: string; difficulty: number; grammar: string };
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
