import type { FastifyReply } from "fastify";
import { world } from "../../world.js";

const payload = JSON.stringify(world);

export default {
  handler: async (_request: unknown, reply: FastifyReply) => {
    return reply
      .type("application/json")
      .header("Cache-Control", "public, max-age=60")
      .send(payload);
  },
};
