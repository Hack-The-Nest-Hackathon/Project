import type { FastifyReply, FastifyRequest } from "fastify";
import { listSaves } from "../../../database/index.js";

export default {
  handler: async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.account) return reply.code(401).send({ message: "Sign in to continue." });
    try {
      return reply.send(await listSaves(request.account.id));
    } catch (error) {
      request.log.warn({ errorName: error instanceof Error ? error.name : "Unknown" }, "Save list failed");
      return reply.code(503).send({ message: "Cloud saves are unavailable." });
    }
  },
};
