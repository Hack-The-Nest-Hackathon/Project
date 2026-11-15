import { generatePlanetMusic } from "./music.js";
import { world } from "./world.js";

const requested = process.argv.slice(2);
const planets = requested.length ? [...new Set(requested)] : world.map(({ id }) => id);
try {
  for (const id of planets) {
    const generated = await generatePlanetMusic(id);
    console.log(`${id}: ${generated ? "saved" : "already saved"}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Music generation failed.");
  process.exitCode = 1;
}
