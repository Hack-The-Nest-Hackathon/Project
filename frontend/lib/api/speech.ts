import { request } from "./client";

export function getAudioUrl(clueId: string) {
  return `/api/audio/${encodeURIComponent(clueId)}`;
}

export function recognizeSpeech(sceneId: string, audio: string, mime: string, signal: AbortSignal) {
  return request<{ transcript: string; recognized: { phrase: string; context: string } | null }>(
    "listen", { method: "POST", json: { sceneId, audio, mime }, signal, timeout: 16_000 },
  );
}
