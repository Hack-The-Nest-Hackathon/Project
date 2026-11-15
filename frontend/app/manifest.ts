import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Voices beyond Stars",
    short_name: "Voices",
    description: "Explore distant worlds and decipher their languages.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#151b25",
    theme_color: "#151b25",
    icons: [
      { src: "/icon-voices-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-voices-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-voices-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
