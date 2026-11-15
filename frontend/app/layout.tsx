import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Field Notes",
  description: "A language exploration game",
  appleWebApp: { capable: true, title: "Field Notes" },
  icons: { apple: "/icon-192.png" },
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
