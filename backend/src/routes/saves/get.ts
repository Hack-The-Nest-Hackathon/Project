import type { FastifyReply, FastifyRequest } from "fastify";
import { listSaves } from "../../../database/index.js";
import { grantQualifiedAchievements } from "../../achievement-service.js";

export default {
  handler: async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.account) return reply.code(401).send({ message: "Sign in to continue." });
    try {
      const saves = await listSaves(request.account.id);
      try {
        await grantQualifiedAchievements(request.account.id, saves);
      } catch (error) {
        request.log.warn({ errorName: error instanceof Error ? error.name : "Unknown" }, "Achievement grant deferred");
      }
      return reply.send(saves);
    } catch (error) {
      request.log.warn({ errorName: error instanceof Error ? error.name : "Unknown" }, "Save list failed");
      return reply.code(503).send({ message: "Cloud saves are unavailable." });
    }
  },
};
