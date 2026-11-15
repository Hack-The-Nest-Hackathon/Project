import type { NextConfig } from "next";

const config: NextConfig = {
  async rewrites() {
    const origin = (process.env.BACKEND_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, "");
    return [{ source: "/api/:path*", destination: `${origin}/api/:path*` }];
  },
};

export default config;
