import type { FastifyReply, FastifyRequest } from "fastify";
import { updateFriendship } from "../../../database/index.js";

type Body = { friendId: string; action: "send" | "accept" | "decline" };

export default {
  config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
  schema: { body: {
    type: "object", additionalProperties: false, required: ["friendId", "action"],
    properties: { friendId: { type: "string", format: "uuid" }, action: { type: "string", enum: ["send", "accept", "decline"] } },
  } },
  handler: async (request: FastifyRequest<{ Body: Body }>, reply: FastifyReply) => {
    if (!request.account) return reply.code(401).send({ message: "Sign in to continue." });
    const { friendId, action } = request.body;
    if (friendId.toLowerCase() === request.account.id) {
      return reply.code(400).send({ message: "Enter another explorer's friend code." });
    }
    try {
      if (await updateFriendship(request.account.id, friendId, action)) return reply.code(204).send();
      return reply.code(422).send({ message: action === "send"
        ? "That explorer could not be added. Check the code and your existing requests."
        : "That request is no longer pending." });
    } catch {
      return reply.code(503).send({ message: "Friend requests are unavailable." });
    }
  },
};
