import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { requireAccount } from "./auth.js";
import { registerRoutes } from "./route.js";
import { db, initializeDatabase } from "../database/index.js";

const app = Fastify({
  logger: true,
  disableRequestLogging: true,
  bodyLimit: 8_192,
  requestTimeout: 15_000,
  ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
});

const publicRoutes = new Set([
  "GET /api/health", "GET /api/auth/login", "GET /api/auth/callback", "POST /api/auth/logout",
]);

try {
  app.decorateRequest("account", null);
  app.addHook("onRequest", async (request, reply) => {
    const path = request.url.split("?")[0];
    if (!publicRoutes.has(`${request.method} ${path}`)) return requireAccount(request, reply);
  });
  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("Cache-Control", "no-store");
    reply.header("Referrer-Policy", "no-referrer");
    return payload;
  });
  app.addHook("onClose", async () => { await db.end(); });
  if (process.env.DATABASE_URL) await initializeDatabase();
  await app.register(rateLimit, { global: false });
  await registerRoutes(app, new URL("./routes/", import.meta.url));
  await app.listen({
    host: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? 3001),
  });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().catch(() => {
      app.log.error("Server shutdown failed");
      process.exitCode = 1;
    });
  });
}
