import { request } from "./client";

export function getAudioUrl(clueId: string, revision = "exact-text-v1") {
  return `/api/audio/${encodeURIComponent(clueId)}?v=${encodeURIComponent(revision)}`;
}

export function getPlanetMusicUrl(sceneId: string) {
  return `/api/music/${encodeURIComponent(sceneId)}`;
}

export function recognizeSpeech(sceneId: string, audio: string, mime: string, signal: AbortSignal, targetId?: string) {
  return request<{ transcript: string; recognized: { phrase: string; context: string } | null }>(
    "listen", { method: "POST", json: { sceneId, audio, mime, targetId }, signal, timeout: 16_000 },
  );
}
