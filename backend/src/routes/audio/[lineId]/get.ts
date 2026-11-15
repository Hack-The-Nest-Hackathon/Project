import type { FastifyReply, FastifyRequest } from "fastify";
import { getSpeech, SpeechError } from "../../../speech.js";

export default {
  config: { rateLimit: { max: 45, timeWindow: "1 minute" } },
  schema: {
    params: {
      type: "object", required: ["lineId"],
      properties: { lineId: { type: "string", maxLength: 40 } },
    },
  },
  handler: async (request: FastifyRequest<{ Params: { lineId: string } }>, reply: FastifyReply) => {
    try {
      const audio = await getSpeech(request.params.lineId);
      return reply.type("audio/mpeg").header("Cache-Control", "public, max-age=3600").send(audio);
    } catch (error) {
      if (error instanceof SpeechError) return reply.code(error.status).send({ message: error.message });
      request.log.warn({ errorName: error instanceof Error ? error.name : "Unknown" }, "Speech request failed");
      return reply.code(502).send({ message: "Speech provider is unavailable" });
    }
  },
};
