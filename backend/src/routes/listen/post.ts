import type { FastifyReply, FastifyRequest } from "fastify";
import { transcribe, SpeechError } from "../../speech.js";
import { practiceLines, scenes } from "../../world.js";

type Body = { sceneId: string; audio: string; mime: string; targetId?: string };
const mimeTypes = new Map([
  ["audio/webm", "audio/webm"], ["video/webm", "audio/webm"],
  ["audio/mp4", "audio/mp4"], ["video/mp4", "audio/mp4"], ["audio/x-m4a", "audio/mp4"],
  ["audio/ogg", "audio/ogg"], ["application/ogg", "audio/ogg"],
  ["audio/wav", "audio/wav"], ["audio/x-wav", "audio/wav"],
]);

export default {
  bodyLimit: 1_400_000,
  config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  schema: {
    body: {
      type: "object", required: ["sceneId", "audio", "mime"], additionalProperties: false,
      properties: {
        sceneId: { type: "string", maxLength: 40 },
        targetId: { type: "string", maxLength: 40 },
        audio: { type: "string", minLength: 8, maxLength: 1_398_104, pattern: "^[A-Za-z0-9+/]+={0,2}$" },
        mime: { type: "string", maxLength: 100 },
      },
    },
  },
  handler: async (request: FastifyRequest<{ Body: Body }>, reply: FastifyReply) => {
    const { sceneId, audio, mime, targetId } = request.body;
    const format = mimeTypes.get(mime.split(";")[0].trim().toLowerCase());
    if (!format) return reply.code(415).send({ message: "This recording format is unsupported. Try a browser that records WebM, Ogg or MP4 audio." });
    const scene = scenes.find(({ id }) => id === sceneId);
    if (!scene) return reply.code(404).send({ message: "Planet not found" });
    const target = targetId ? practiceLines.get(targetId) : undefined;
    if (targetId && target?.sceneId !== sceneId) return reply.code(404).send({ message: "Practice line not found on this planet" });
    const bytes = Buffer.from(audio, "base64");
    if (bytes.length > 1_048_576) return reply.code(413).send({ message: "Recording is too large" });
    try {
      const transcript = await transcribe(bytes, format, "fr");
      const normalize = (value: string) => value.normalize("NFKD").toLowerCase().replace(/ŋ/g, "ng").replace(/[^a-z]/g, "");
      const spoken = normalize(transcript);
      const matches = ({ phrase }: { phrase: string }) =>
        Boolean(spoken && spoken === normalize(phrase));
      const match = target ? (matches(target) ? target : undefined) : scene.clues.find(matches);
      return { transcript, recognized: match ? { phrase: match.phrase, context: "context" in match ? match.context : "Practice reply" } : null };
    } catch (error) {
      const status = error instanceof SpeechError ? error.status : 502;
      return reply.code(status).send({ message: error instanceof SpeechError ? error.message : "Transcription failed" });
    }
  },
};
