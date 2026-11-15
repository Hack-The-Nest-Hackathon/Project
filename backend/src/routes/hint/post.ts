import type { FastifyRequest, FastifyReply } from "fastify";
import { scenes } from "../../world.js";

type Body = { sceneId: string; observedClueIds: string[] };

export default {
  schema: {
    body: {
      type: "object", required: ["sceneId", "observedClueIds"], additionalProperties: false,
      properties: {
        sceneId: { type: "string", maxLength: 40 },
        observedClueIds: {
          type: "array", maxItems: 12, uniqueItems: true,
          items: { type: "string", maxLength: 40 },
        },
      },
    },
  },
  handler: async (request: FastifyRequest<{ Body: Body }>, reply: FastifyReply) => {
    const scene = scenes.find(({ id }) => id === request.body.sceneId);
    if (!scene) return reply.code(404).send({ message: "Scene not found" });

    const observed = new Set(request.body.observedClueIds);
    const evidenceIds = scene.clues.filter(({ id }) => observed.has(id)).map(({ id }) => id);
    const hasPair = scene.id === "market"
      ? observed.has("apple-one") && observed.has("apple-two")
      : observed.has(scene.id === "outpost" ? "lantern-one" : `${scene.id}-lantern-one`)
        && observed.has(scene.id === "outpost" ? "lantern-many" : `${scene.id}-lantern-many`);

    return {
      hint: hasPair ? scene.hints[0] : "Find two clues that show different quantities of the same thing.",
      evidenceIds,
      source: "scripted",
    };
  },
};
