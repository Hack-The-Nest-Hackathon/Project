import { lines } from "./world.js";

let rawKeys: unknown;
try {
  rawKeys = JSON.parse(process.env.ELEVENLABS_API_KEYS ?? "[]");
} catch {
  throw new Error("ELEVENLABS_API_KEYS must be valid JSON");
}
if (!Array.isArray(rawKeys) || rawKeys.some((key) => typeof key !== "string" || !key.trim())) {
  throw new Error("ELEVENLABS_API_KEYS must be a JSON array of nonempty strings");
}

const keys: string[] = [...new Set(rawKeys.map((key: string) => key.trim()))];
const voice = process.env.ELEVENLABS_VOICE_ID?.trim();
const model = process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";
const concurrency = Number(process.env.ELEVENLABS_CONCURRENCY ?? 1);
if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
  throw new Error("ELEVENLABS_CONCURRENCY must be a positive integer");
}

export class SpeechError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const cache = new Map<string, Buffer>();
const pending = new Map<string, Promise<Buffer>>();
const disabled = new Set<number>();
let cursor = 0;
let active = 0;
let retryAfter = 0;

function nextKey() {
  for (let count = 0; count < keys.length; count++) {
    const index = cursor;
    cursor = (cursor + 1) % keys.length;
    if (!disabled.has(index)) return { index, secret: keys[index] };
  }
  throw new SpeechError(503, "Speech credentials are unavailable");
}

async function requestSpeech(send: (key: string) => Promise<Response>) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const key = nextKey();
    const response = await send(key.secret);
    if (response.ok) return response;

    const details = await response.json().catch(() => null);
    const code = details?.detail?.status;
    if (response.status === 401 && ["invalid_api_key", "authentication_error"].includes(code)) {
      disabled.add(key.index);
      continue;
    }
    if (response.status === 429 || code === "quota_exceeded") {
      const seconds = Number(response.headers.get("retry-after"));
      const cooldown = code === "quota_exceeded" ? 60_000 : Math.max(2, seconds || 0) * 1000;
      retryAfter = Math.max(retryAfter, Date.now() + cooldown);
      throw new SpeechError(503, "Speech provider is temporarily unavailable");
    }
    throw new SpeechError(502, "Speech provider rejected the request");
  }
  throw new SpeechError(503, "Speech credentials are unavailable");
}

async function synthesize(voiceId: string, line: { speech: string; language: string }) {
  const signal = AbortSignal.timeout(8_000);
  const response = await requestSpeech((key) => fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text: line.speech, model_id: model, language_code: line.language }),
        signal,
      },
  ));
  return Buffer.from(await response.arrayBuffer());
}

export function getSpeech(lineId: string): Promise<Buffer> {
  const line = lines.get(lineId);
  if (!line) throw new SpeechError(404, "Line not found");
  const cacheKey = JSON.stringify([line.language, line.speech]);
  const cached = cache.get(cacheKey);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(cacheKey);
  if (existing) return existing;
  if (!keys.length || !voice) throw new SpeechError(503, "Speech is not configured");
  if (active >= concurrency || Date.now() < retryAfter) {
    throw new SpeechError(503, "Speech is busy. Try again shortly");
  }

  active++;
  const request = synthesize(voice, line)
    .then((audio) => {
      cache.set(cacheKey, audio);
      return audio;
    })
    .finally(() => {
      active--;
      pending.delete(cacheKey);
    });
  pending.set(cacheKey, request);
  return request;
}

export async function transcribe(bytes: Uint8Array, mime: string, language: string) {
  if (!keys.length) throw new SpeechError(503, "Speech recognition is not configured");
  if (active >= concurrency || Date.now() < retryAfter) throw new SpeechError(503, "Speech is busy");

  active++;
  try {
    const form = new FormData();
    const ext = mime === "audio/mp4" ? "m4a" : mime.split("/")[1];
    form.set("file", new Blob([Uint8Array.from(bytes)], { type: mime }), `recording.${ext}`);
    form.set("model_id", "scribe_v2");
    form.set("language_code", language);
    const signal = AbortSignal.timeout(12_000);
    const response = await requestSpeech((key) => fetch("https://api.elevenlabs.io/v1/speech-to-text?enable_logging=false", {
      method: "POST",
      headers: { "xi-api-key": key },
      body: form,
      signal,
    }));
    const result = await response.json();
    if (typeof result?.text !== "string") throw new SpeechError(502, "Speech recognition returned no transcript");
    return result.text;
  } finally {
    active--;
  }
}
