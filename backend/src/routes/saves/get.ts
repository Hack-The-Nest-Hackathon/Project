import type { FastifyReply, FastifyRequest } from "fastify";
import { listSaves } from "../../../database/index.js";
import { saveHeaders, type SaveHeaders } from "../../saves.js";

export default {
  schema: { headers: saveHeaders },
  handler: async (request: FastifyRequest<{ Headers: SaveHeaders }>, reply: FastifyReply) => {
    if (!process.env.DATABASE_URL) return reply.code(503).send({ message: "PostgreSQL is not configured" });
    const saves = await listSaves(request.headers["x-save-key"]);
    return reply.header("Cache-Control", "no-store").send(saves);
  },
};
