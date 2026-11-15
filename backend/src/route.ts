import type { FastifyInstance } from "fastify";
import { readdir } from "node:fs/promises";

const methods = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);

export async function registerRoutes(app: FastifyInstance, directory: URL, prefix = "/api") {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      const name = entry.name.replace(/^\[([a-zA-Z][a-zA-Z0-9_]*)\]$/, ":$1");
      await registerRoutes(app, new URL(`${entry.name}/`, directory), `${prefix}/${name}`);
      continue;
    }

    const [method, extension] = entry.name.split(".");
    if (!entry.isFile() || !methods.has(method) || !["js", "ts"].includes(extension)
      || entry.name !== `${method}.${extension}`) continue;

    const route = await import(new URL(entry.name, directory).href);
    app.route({ ...route.default, method: method.toUpperCase(), url: prefix });
  }
}
