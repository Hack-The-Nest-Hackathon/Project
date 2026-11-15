import type { FastifyReply, FastifyRequest } from "fastify";
import { beginLogin } from "../../../auth.js";

export default {
  config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
  schema: {
    querystring: {
      type: "object", required: ["origin"], properties: { origin: { type: "string", maxLength: 255 } },
    },
  },
  handler: async (request: FastifyRequest<{ Querystring: { origin: string } }>, reply: FastifyReply) => {
    try {
      const login = await beginLogin(request.query.origin);
      if (!login) return reply.redirect("/?login=origin", 303);
      return reply.header("Set-Cookie", login.cookie).redirect(login.url, 303);
    } catch (error) {
      request.log.warn({ errorName: error instanceof Error ? error.name : "Unknown" }, "SSOJet login unavailable");
      return reply.redirect("/?login=unavailable", 303);
    }
  },
};
