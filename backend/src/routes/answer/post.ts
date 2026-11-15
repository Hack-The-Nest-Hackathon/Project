import type { FastifyReply, FastifyRequest } from "fastify";
import { scenes } from "../../world.js";

type Body = { sceneId: string; choices: number[] };

export default {
  schema: {
    body: {
      type: "object", required: ["sceneId", "choices"], additionalProperties: false,
      properties: {
        sceneId: { type: "string", maxLength: 40 },
        choices: { type: "array", minItems: 1, maxItems: 12, items: { type: "integer", minimum: 0, maximum: 10 } },
      },
    },
  },
  handler: async (request: FastifyRequest<{ Body: Body }>, reply: FastifyReply) => {
    const { sceneId, choices } = request.body;
    const scene = scenes.find(({ id }) => id === sceneId);
    if (!scene) return reply.code(404).send({ message: "Scene not found" });
    if (choices.length !== scene.questions.length ||
        scene.questions.some(({ options }, index) => choices[index] >= options.length)) {
      return reply.code(400).send({ message: "Submit one valid choice for every question" });
    }
    const score = scene.questions.filter(({ answer }, index) => choices[index] === answer).length;
    return { correct: score === scene.questions.length, score, total: scene.questions.length };
  },
};
