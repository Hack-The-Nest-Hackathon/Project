import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const config: NextConfig = {
  // Browsers loading the dev server by IP send that IP as the origin of Next.js modules.
  allowedDevOrigins: Object.values(networkInterfaces()).flatMap((addresses) =>
    (addresses ?? []).filter(({ family }) => family === "IPv4").map(({ address }) => address)),
  experimental: { proxyTimeout: 100_000 },
  async rewrites() {
    const origin = (process.env.BACKEND_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, "");
    return [{ source: "/api/:path*", destination: `${origin}/api/:path*` }];
  },
};

export default config;
