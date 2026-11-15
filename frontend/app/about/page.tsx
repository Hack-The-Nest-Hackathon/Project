import type { Metadata } from "next";
import AboutExpedition from "../../features/title/about-expedition";

export const metadata: Metadata = {
  title: "Mission Briefing · Voices beyond Stars",
  description: "Explore the idea behind Voices beyond Stars and try translating an unfamiliar phrase with context.",
};

export default function AboutPage() {
  return <main className="game-shell briefing-page"><AboutExpedition /></main>;
}
