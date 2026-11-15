import type { FastifyRequest } from "fastify";

export default {
  handler: async (request: FastifyRequest) => request.account,
};
