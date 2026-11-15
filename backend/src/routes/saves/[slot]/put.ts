import type { FastifyReply, FastifyRequest } from "fastify";
import { upsertSave } from "../../../../database/index.js";
import {
  characterSchema,
  isValidProgress,
  saveHeaders,
  type Progress,
  type SaveHeaders,
} from "../../../saves.js";

type Request = {
  Headers: SaveHeaders;
  Params: { slot: "1" | "2" | "3" };
  Body: Progress;
};
const ids = {
  type: "array",
  uniqueItems: true,
  maxItems: 240,
  items: { type: "string", maxLength: 40 },
};

export default {
  schema: {
    headers: saveHeaders,
    params: {
      type: "object",
      required: ["slot"],
      properties: { slot: { type: "string", enum: ["1", "2", "3"] } },
    },
    body: {
      type: "object",
      required: ["planet", "observed", "badges"],
      additionalProperties: false,
      properties: {
        planet: { type: "string", maxLength: 40 },
        observed: ids,
        badges: ids,
        character: characterSchema,
      },
    },
  },
  handler: async (request: FastifyRequest<Request>, reply: FastifyReply) => {
    if (!process.env.DATABASE_URL)
      return reply.code(503).send({ message: "PostgreSQL is not configured" });
    if (!isValidProgress(request.body)) {
      return reply.code(400).send({ message: "Invalid save progress" });
    }
    await upsertSave(
      request.headers["x-save-key"],
      Number(request.params.slot),
      request.body,
    );
    return reply.code(204).send();
  },
};
