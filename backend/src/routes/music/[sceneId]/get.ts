import type { FastifyReply, FastifyRequest } from "fastify";
import { getPlanetMusic } from "../../../music.js";
import { SpeechError } from "../../../speech.js";

export default {
  config: { rateLimit: { max: 8, timeWindow: "1 minute" } },
  schema: { params: { type: "object", required: ["sceneId"], properties: { sceneId: { type: "string", maxLength: 40 } } } },
  handler: async (request: FastifyRequest<{ Params: { sceneId: string } }>, reply: FastifyReply) => {
    try {
      const music = await getPlanetMusic(request.params.sceneId);
      return reply.type("audio/mpeg").header("Cache-Control", "public, max-age=3600").send(music);
    } catch (error) {
      if (error instanceof SpeechError) return reply.code(error.status).send({ message: error.message });
      request.log.warn({ errorName: error instanceof Error ? error.name : "Unknown" }, "Planet music failed");
      return reply.code(502).send({ message: "Planet music is unavailable." });
    }
  },
};
