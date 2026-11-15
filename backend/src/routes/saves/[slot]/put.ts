import type { FastifyReply, FastifyRequest } from "fastify";
import { upsertSave } from "../../../../database/index.js";
import { grantQualifiedAchievements } from "../../../achievement-service.js";
import {
  characterSchema,
  isValidProgress,
  type Progress,
} from "../../../saves.js";

type Request = {
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
  bodyLimit: 65_536,
  schema: {
    headers: {
      type: "object", required: ["x-account-id"],
      properties: { "x-account-id": { type: "string", format: "uuid" } },
    },
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
        visited: ids,
        character: characterSchema,
        photos: {
          type: "array", maxItems: 27, items: {
            type: "object", additionalProperties: false,
            required: ["sceneId", "nasaId", "title", "credit", "imageUrl"],
            properties: {
              sceneId: { type: "string", maxLength: 40 },
              nasaId: { type: "string", maxLength: 120, pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$" },
              title: { type: "string", minLength: 1, maxLength: 180 },
              credit: { type: "string", minLength: 1, maxLength: 160 },
              location: { type: "string", maxLength: 140 },
              imageUrl: { type: "string", maxLength: 500 },
            },
          },
        },
      },
    },
  },
  handler: async (request: FastifyRequest<Request>, reply: FastifyReply) => {
    if (!request.account) return reply.code(401).send({ message: "Sign in to continue." });
    if (!isValidProgress(request.body)) {
      return reply.code(400).send({ message: "Invalid save progress" });
    }
    try {
      await upsertSave(request.account.id, Number(request.params.slot), request.body);
    } catch (error) {
      request.log.warn({ errorName: error instanceof Error ? error.name : "Unknown" }, "Save write failed");
      return reply.code(503).send({ message: "Cloud saves are unavailable." });
    }
    try {
      await grantQualifiedAchievements(request.account.id);
    } catch (error) {
      request.log.warn({ errorName: error instanceof Error ? error.name : "Unknown" }, "Achievement grant deferred");
    }
    return reply.code(204).send();
  },
};
