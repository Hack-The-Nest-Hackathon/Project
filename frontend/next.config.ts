import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const config: NextConfig = {
  // Browsers loading the dev server by IP send that IP as the origin of Next.js modules.
  allowedDevOrigins: Object.values(networkInterfaces()).flatMap((addresses) =>
    (addresses ?? []).filter(({ family }) => family === "IPv4").map(({ address }) => address)),
};

export default config;
