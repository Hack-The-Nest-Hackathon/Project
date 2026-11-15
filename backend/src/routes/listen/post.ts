import type { FastifyReply, FastifyRequest } from "fastify";
import { transcribe, SpeechError } from "../../speech.js";
import { scenes } from "../../world.js";

type Body = { sceneId: string; audio: string; mime: string };
const mimeTypes = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav"];

export default {
  bodyLimit: 1_400_000,
  config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  schema: {
    body: {
      type: "object", required: ["sceneId", "audio", "mime"], additionalProperties: false,
      properties: {
        sceneId: { type: "string", maxLength: 40 },
        audio: { type: "string", minLength: 8, maxLength: 1_398_104, pattern: "^[A-Za-z0-9+/]+={0,2}$" },
        mime: { type: "string", enum: mimeTypes },
      },
    },
  },
  handler: async (request: FastifyRequest<{ Body: Body }>, reply: FastifyReply) => {
    const { sceneId, audio, mime } = request.body;
    const scene = scenes.find(({ id }) => id === sceneId);
    if (!scene) return reply.code(404).send({ message: "Planet not found" });
    const bytes = Buffer.from(audio, "base64");
    if (bytes.length > 1_048_576) return reply.code(413).send({ message: "Recording is too large" });
    try {
      const transcript = await transcribe(bytes, mime, "fr");
      const normalize = (value: string) => value.normalize("NFKD").toLowerCase().replace(/[^a-z]/g, "");
      const spoken = normalize(transcript);
      const match = spoken && scene.clues.find(({ phrase, speech }) =>
        spoken === normalize(phrase) || spoken === normalize(speech));
      return { transcript, recognized: match ? { phrase: match.phrase, context: match.context } : null };
    } catch (error) {
      const status = error instanceof SpeechError ? error.status : 502;
      return reply.code(status).send({ message: error instanceof SpeechError ? error.message : "Transcription failed" });
    }
  },
};
