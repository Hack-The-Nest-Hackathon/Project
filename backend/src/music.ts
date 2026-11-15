import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { requestSpeech, SpeechError } from "./speech.js";
import { world } from "./world.js";

const motifs = [
  "a bouncy pizzicato melody, flute responses, and finger percussion",
  "glass chimes, a restrained low pulse, and airy woodwinds",
  "a hammered dulcimer ostinato and soft frame drums",
  "muted marimba, breathy recorder, and brushed percussion",
  "a warm square-wave lead and a syncopated plucked bass",
  "arpeggiated harp, hollow wooden taps, and a distant synth pad",
];
const directory = resolve(process.env.FIELD_NOTES_MUSIC_CACHE ?? ".music-cache");

export function musicPrompt(id: string) {
  const index = world.findIndex((scene) => scene.id === id);
  if (index < 0) throw new SpeechError(404, "Planet not found");
  const scene = world[index];
  const setting = id === "market" ? "a lively market" : id === "outpost" ? "a lantern-lit frontier outpost"
    : scene.dialect === "Harbor speech" ? "a coastal resupply station"
    : scene.dialect === "Highland speech" ? "a windy highland signal station" : "a remote desert survey camp";
  return `Instrumental pixel-art exploration game soundtrack for ${scene.title}, ${setting}. Use ${motifs[index % motifs.length]} at ${76 + (index * 7) % 29} BPM. Keep dialogue intelligible with sparse arrangements and no vocals. Keep the opening and closing texture similar for looping.`;
}

export async function getPlanetMusic(id: string): Promise<Buffer> {
  musicPrompt(id);
  try {
    return await readFile(resolve(directory, `v1-${id}.mp3`));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    throw new SpeechError(404, "This planet’s soundtrack has not been generated yet.");
  }
}

export async function generatePlanetMusic(id: string) {
  const prompt = musicPrompt(id);
  try {
    await getPlanetMusic(id);
    return false;
  } catch (error) {
    if (!(error instanceof SpeechError) || error.status !== 404) throw error;
  }
  const file = resolve(directory, `v1-${id}.mp3`);
  const response = await requestSpeech((key) => fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ prompt, music_length_ms: 30_000, force_instrumental: true }),
    signal: AbortSignal.timeout(90_000),
  }), { rotateOnLimit: true });
  const track = Buffer.from(await response.arrayBuffer());
  if (!track.length) throw new Error("ElevenLabs returned an empty soundtrack");
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(temporary, track);
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch(() => {});
  }
  return true;
}
