import type { FastifyReply, FastifyRequest } from "fastify";
import { getNasaPhoto } from "../../../nasa.js";

export default {
  config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
  schema: { params: { type: "object", required: ["sceneId"], properties: { sceneId: { type: "string", maxLength: 40 } } } },
  async handler(request: FastifyRequest<{ Params: { sceneId: string } }>, reply: FastifyReply) {
    const photo = getNasaPhoto(request.params.sceneId);
    if (!photo) return reply.code(404).send({ message: "Planet not found" });
    try {
      return reply.header("Cache-Control", "public, max-age=3600").send(await photo);
    } catch {
      return reply.code(503).send({ message: "The NASA archive is unavailable. Try developing the photo again from your scrapbook." });
    }
  },
};
