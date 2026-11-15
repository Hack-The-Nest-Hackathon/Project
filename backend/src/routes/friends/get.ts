import type { FastifyReply, FastifyRequest } from "fastify";
import { getFriends } from "../../../database/index.js";

export default {
  config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
  handler: async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.account) return reply.code(401).send({ message: "Sign in to continue." });
    try {
      return reply.send(await getFriends(request.account.id));
    } catch {
      return reply.code(503).send({ message: "The friends list is unavailable." });
    }
  },
};
