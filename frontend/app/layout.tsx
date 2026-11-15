import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voices beyond Stars",
  applicationName: "Voices beyond Stars",
  description: "Explore distant worlds and decipher their languages in a pixel-art adventure.",
  appleWebApp: { capable: true, title: "Voices beyond Stars" },
  icons: {
    apple: { url: "/icon-voices-180.png", sizes: "180x180", type: "image/png" },
  },
};
export const viewport: Viewport = { themeColor: "#100e21", viewportFit: "cover" };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
