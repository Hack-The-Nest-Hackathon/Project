import type { FastifyReply, FastifyRequest } from "fastify";
import { syncAchievementAwards } from "../../achievement-service.js";

export default {
  handler: async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.account) return reply.code(401).send({ message: "Sign in to continue." });
    try {
      return reply.send(await syncAchievementAwards(request.account.id));
    } catch (error) {
      request.log.warn({ errorName: error instanceof Error ? error.name : "Unknown" }, "Achievement lookup failed");
      return reply.code(503).send({ message: "Achievements are unavailable." });
    }
  },
};
