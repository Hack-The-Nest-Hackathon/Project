import type { Scene, Signal } from "./world.js";

const clicks = (...beats: ("click" | "chime")[]): Signal => ({ kind: "sound", beats });
const gestures = (...beats: ("left" | "right" | "wait")[]): Signal => ({ kind: "gesture", beats });
const glyphs = (...beats: ("bring" | "check" | "lantern" | "marker")[]): Signal => ({ kind: "glyph", beats });

export const echoBasin: Scene = {
  id: "echo-basin",
  title: "Echo Basin",
  language: "Basin signals",
  region: "highland",
  description: "Decode clicks, gestures, and a living stone script at three stations in the basin.",
  mission: {
    briefing: "Visit all three stations. Compare each signal with what happens around it.",
    difficulty: 2,
    grammar: "Counts, directions, and written commands each use ordered signals.",
  },
  clues: [
    { id: "basin-tick-one", speaker: "Tikk", phrase: "Click, then chime.", signal: clicks("click", "chime"),
      context: "Tikk sets one lantern by the path and signals just as it lights." },
    { id: "basin-tick-two", speaker: "Tikk", phrase: "Click, click, then chime.", signal: clicks("click", "click", "chime"),
      context: "Tikk adds a second lantern. Both are lit before the chime fades." },
    { id: "basin-mova-left", speaker: "Mova", phrase: "Points screen-left.", signal: gestures("left"),
      context: "Mova signals to a courier. The courier takes the left fork." },
    { id: "basin-mova-hold", speaker: "Mova", phrase: "Crouches, then points screen-right.", signal: gestures("wait", "right"),
      context: "A dust cloud crosses the path. The courier stops, waits for it to clear, then takes the right fork." },
    { id: "basin-vey-bring", speaker: "Vey", phrase: "Hook glyph, then lantern glyph.", signal: glyphs("bring", "lantern"),
      context: "Vey carves two glyphs. A courier reads them, then brings a lantern to the stone." },
    { id: "basin-vey-check", speaker: "Vey", phrase: "Eye glyph, then marker glyph.", signal: glyphs("check", "marker"),
      context: "Vey carves a new pair. The courier inspects a trail marker and leaves it where it is." },
  ],
  questions: [
    { prompt: "What does Tikk report?", signal: clicks("click", "click", "click", "chime"),
      options: ["Three lanterns are lit.", "One lantern is lit.", "Two lanterns are lit."], answer: 0 },
    { prompt: "What should the courier do?", signal: gestures("wait", "left"),
      options: ["Go left immediately.", "Wait, then go left.", "Wait, then go right."], answer: 1 },
    { prompt: "Read Vey’s new inscription.", signal: glyphs("check", "lantern"),
      options: ["Bring the lantern.", "Check the marker.", "Check the lantern."], answer: 2 },
    { prompt: "Read the second inscription.", signal: glyphs("bring", "marker"),
      options: ["Bring the marker.", "Check the marker.", "Bring the lantern."], answer: 0 },
  ],
  hints: ["Count the clicks before the chime. Watch when the courier stops, and compare which pictograph changes when Vey gives a new command."],
};
