import { lines, quizLines, practiceLines, type SpokenLine } from "./world.js";

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
const fallbackVoice = process.env.ELEVENLABS_VOICE_ID?.trim();
const cast: Readonly<Record<string, { id: string; speed: number; stability: number }>> = {
  Merchant: { id: "QtY3JBOUKEB5xzrRfOKc", speed: 1.03, stability: 0.40 }, // Maisie, friendly market vendor
  Baker: { id: "gOupLcAkjEnguROwi4oS", speed: .93, stability: 0.49 }, // Darian, warm and unhurried
  Quartermaster: { id: "WQP7cQUF5aAS6Axh5yaa", speed: 1, stability: 0.54 }, // Elara, crisp instructions
  Lamplighter: { id: "OZ0L6eISlOejga3XjDFt", speed: .91, stability: 0.56 }, // Talia, gentle guide
  Scout: { id: "dvbL7qkNGZY1IqPGZAjM", speed: 1.08, stability: 0.37 }, // Elowen, eager scout
  Gatekeeper: { id: "6WwXjDDEMyNmFG95zycZ", speed: .94, stability: 0.57 }, // Eldrin, measured baritone
  "station-0": { id: "QtY3JBOUKEB5xzrRfOKc", speed: .98, stability: 0.43 },
  "station-1": { id: "gOupLcAkjEnguROwi4oS", speed: .95, stability: 0.49 },
  "station-2": { id: "WQP7cQUF5aAS6Axh5yaa", speed: 1.04, stability: 0.52 },
  player: { id: "l7kNoIfnJKPg7779LI2t", speed: 1.02, stability: 0.46 }, // Eddie, conversational explorer
};
const overrides: unknown = JSON.parse(process.env.ELEVENLABS_CHARACTER_VOICES || "{}");
if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)
  || Object.entries(overrides).some(([role, id]) =>
    !Object.hasOwn(cast, role) || typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(id))) {
  throw new Error("ELEVENLABS_CHARACTER_VOICES must map supported roles to voice IDs");
}
const customVoices = overrides as Record<string, string>;
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

export async function requestSpeech(
  send: (key: string) => Promise<Response>,
  { rotateOnLimit = false } = {},
) {
  const attempts = rotateOnLimit ? keys.length : 2;
  let limited = false;
  for (let attempt = 0; attempt < attempts; attempt++) {
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
      if (rotateOnLimit) {
        limited = true;
        continue;
      }
      const seconds = Number(response.headers.get("retry-after"));
      const cooldown = code === "quota_exceeded" ? 60_000 : Math.max(2, seconds || 0) * 1000;
      retryAfter = Math.max(retryAfter, Date.now() + cooldown);
      throw new SpeechError(503, "Speech provider is temporarily unavailable");
    }
    throw new SpeechError(502, "Speech provider rejected the request");
  }
  if (limited) throw new SpeechError(503, "Music provider is temporarily unavailable");
  throw new SpeechError(503, "Speech credentials are unavailable");
}

const conversationDelivery = {
  greeting: { stabilityOffset: -.04, style: .16, speed: 1 },
  question: { stabilityOffset: -.06, style: .13, speed: .97 },
  praise: { stabilityOffset: -.08, style: .2, speed: 1.02 },
  neutral: { stabilityOffset: 0, style: .08, speed: 1 },
} as const;

function voiceSettings(line: SpokenLine, profile: (typeof cast)[string] | undefined) {
  const spokenDialogue = line.language === "en";
  if (model === "eleven_v3") return { stability: spokenDialogue ? .5 : 1 };

  const delivery = conversationDelivery[line.delivery ?? "neutral"];
  const baseSpeed = profile?.speed ?? 1;
  const settings = spokenDialogue
    ? { speed: baseSpeed * delivery.speed, stability: (profile?.stability ?? .48) + delivery.stabilityOffset, style: delivery.style }
    : { speed: Math.min(baseSpeed, 1) * .95, stability: .68, style: 0 };
  return {
    speed: Number(settings.speed.toFixed(2)),
    stability: Number(settings.stability.toFixed(2)),
    style: settings.style,
    similarity_boost: .75,
  };
}

async function synthesize(voiceId: string, settings: ReturnType<typeof voiceSettings>, line: SpokenLine) {
  const signal = AbortSignal.timeout(8_000);
  const response = await requestSpeech((key) => fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({
          text: line.phrase, model_id: model, language_code: line.language, voice_settings: settings,
        }),
        signal,
      },
  ));
  return Buffer.from(await response.arrayBuffer());
}

export function getSpeech(lineId: string): Promise<Buffer> {
  const line = lines.get(lineId) ?? quizLines.get(lineId) ?? practiceLines.get(lineId);
  if (!line || line.silent) throw new SpeechError(404, "Spoken line not found");
  const role = line.voiceRole ?? "";
  const profile = cast[role];
  const voice = customVoices[role] ?? profile?.id ?? fallbackVoice ?? cast.player.id;
  const settings = voiceSettings(line, profile);
  const cacheKey = JSON.stringify([voice, settings, model, line.language, line.phrase]);
  const cached = cache.get(cacheKey);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(cacheKey);
  if (existing) return existing;
  if (!keys.length) throw new SpeechError(503, "Speech is not configured");
  if (active >= concurrency || Date.now() < retryAfter) {
    throw new SpeechError(503, "Speech is busy. Try again shortly");
  }

  active++;
  const request = synthesize(voice, settings, line)
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
