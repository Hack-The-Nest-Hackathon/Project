import { createHash } from "node:crypto";
type Observation = { label: string; prop: "apple" | "bread" | "lantern" | "marker" | "crate"; count: number; action: "show" | "load" | "carry" | "see" };
import { echoBasin } from "./echo-basin.js";
import { createMission } from "./missions.js";
import { marketScene, outpostScene } from "./starter-missions.js";
import { speechLanguage } from "./language/lexicon.js";
import { analyzeEmotionalContext } from "./emotional-context.js";

export type Signal =
  | { kind: "sound"; beats: ("click" | "chime")[] }
  | { kind: "gesture"; beats: ("left" | "right" | "wait")[] }
  | { kind: "glyph"; beats: ("bring" | "check" | "lantern" | "marker")[] };

export type Reply = { choice: string; roles: string[]; phrase: string; pronunciation?: string; translation: string; glosses?: string[]; prompt: string; acknowledgment: string };
type FollowUp = { phrase: string; translation: string; prompt: string; alternatives: string[]; pronunciation?: string; glosses?: string[]; roles?: string[] };
export type Clue = { id: string; speaker: string; context: string; phrase: string; pronunciation?: string; translation?: string; emotionalContext?: { tone: string; reading: string }; glosses?: string[]; roles?: string[]; replies?: Reply[]; followUp?: FollowUp; observation?: Observation; signal?: Signal };
export type Question = {
  prompt: string; options: string[]; answer: number; phrase?: string; pronunciation?: string;
  glosses?: string[]; signal?: Signal;
};
export type Scene = { id: string; title: string; language: string; description: string; region: "harbor" | "highland" | "dune"; mission?: { briefing: string; difficulty: number; grammar: string }; clues: Clue[]; questions: Question[]; hints: string[] };

const planetNames = [
  "Vainmar", "Reumket", "Vainzoom", "Vaingmal", "Reumkes", "Nashzoom", "Vainmair", "Reumshit", "Nashzum",
  "Vaingmar", "Reumsheut", "Naishzum", "Vainmal", "Reumshet", "Naishzom", "Vaingket", "Reumses", "Vaingzoom",
  "Vainket", "Reumkis", "Nazhzum", "Vaingmair", "Reumsheus", "Naizhzum", "Vainkes",
];
const generated = planetNames.map((name, index) => createMission(index, name, index % 3));

export const scenes = [marketScene, outpostScene, echoBasin, ...generated];

export type SpokenLine = {
  phrase: string;
  language: string;
  voiceRole?: string;
  silent?: boolean;
  delivery?: "greeting" | "question" | "praise";
};
export const lines = new Map<string, SpokenLine>();

const greetings: Readonly<Record<string, string>> = {
  Merchant: "Morning, traveler. Could you help me check the labels on this shipment?",
  Baker: "Mind the flour! I have a few loaves here that still need labels.",
  Quartermaster: "Glad you're here. I could use another set of eyes on this manifest.",
  Lamplighter: "Come closer. We're counting the last of the lanterns before dark.",
  Scout: "Hey, traveler! Give me a hand checking what we brought back?",
  Gatekeeper: "Hold up a moment. I need to check what the scout is carrying through the gate.",
};

function openingFor(scene: Scene, clue: Clue) {
  const first = scene.clues.find(({ speaker }) => speaker === clue.speaker) === clue;
  return {
    npc: first ? greetings[clue.speaker] ?? "Glad you stopped by. I could use your help with a report."
      : "There's another detail I want to show you.",
    player: first ? "Sure. Show me what you've got." : "All right, I'm listening.",
    question: "I caught some of that. Can I try saying a line?",
    bridge: "Okay, can I hear one more before I go?",
    speak: first && clue.replies?.length ? "Want to try saying that line out loud? I'll listen." : undefined,
  };
}

function replyAcknowledgment(scene: Scene, clue: Clue, reply: Reply) {
  const hasMore = clue.followUp || scene.clues.some(({ speaker }, index) =>
    speaker === clue.speaker && index > scene.clues.indexOf(clue));
  return `${reply.acknowledgment} ${hasMore ? "Would you like to keep going?" : "That's everything I wanted to show you."}`;
}

function castRole(scene: Scene, clue: Clue) {
  return scene.id === "market" || scene.id === "outpost" ? clue.speaker
    : `station-${[...new Set(scene.clues.map(({ speaker }) => speaker))].indexOf(clue.speaker)}`;
}
export const quizLines = new Map<string, SpokenLine>();
for (const scene of scenes) {
  for (const clue of scene.clues) lines.set(clue.id, {
    phrase: clue.phrase, language: speechLanguage, voiceRole: castRole(scene, clue), silent: Boolean(clue.signal),
  });
  scene.questions.forEach(({ phrase, signal }, index) => {
    if (phrase && !signal) quizLines.set(`${scene.id}-quiz-${index}`, { phrase, language: speechLanguage });
  });
}

function wordsOf(text: string) {
  return text.split(/\s+/u).map((word) => word.replace(/[.!?,;:]+$/u, ""));
}

export const practiceLines = new Map<string, SpokenLine & { sceneId: string }>();
const vocabulary = new Map<string, { id: string; word: string; pronunciation?: string }[]>();
for (const scene of scenes) {
  for (const clue of scene.clues) {
    if (clue.signal) continue;
    const voiceRole = castRole(scene, clue);
    const opening = openingFor(scene, clue);
    lines.set(`${clue.id}-hello`, { phrase: opening.npc, language: "en", voiceRole, delivery: "greeting" });
    lines.set(`${clue.id}-you`, { phrase: opening.player, language: "en", voiceRole: "player" });
    lines.set(`${clue.id}-ask`, { phrase: opening.question, language: "en", voiceRole: "player", delivery: "question" });
    if (opening.speak) lines.set(`${clue.id}-speak`, { phrase: opening.speak, language: "en", voiceRole, delivery: "question" });
    const pronunciations = clue.pronunciation?.split(" ");
    vocabulary.set(clue.id, wordsOf(clue.phrase).map((word, index) => {
      const id = `${clue.id}-w${index}`;
      practiceLines.set(id, { sceneId: scene.id, phrase: word, language: speechLanguage, voiceRole });
      return { id, word, pronunciation: pronunciations?.[index] };
    }));
    clue.replies?.forEach((reply, index) => {
      practiceLines.set(`${clue.id}-r${index}`, { ...reply, sceneId: scene.id, language: speechLanguage, voiceRole: "player" });
      quizLines.set(`${clue.id}-e${index}`, { phrase: reply.prompt, language: "en", voiceRole });
      quizLines.set(`${clue.id}-a${index}`, { phrase: replyAcknowledgment(scene, clue, reply), language: "en", voiceRole, delivery: "praise" });
    });
    if (clue.followUp) {
      lines.set(`${clue.id}-bridge`, { phrase: opening.bridge, language: "en", voiceRole: "player", delivery: "question" });
      lines.set(`${clue.id}-meaning`, { phrase: clue.followUp.translation, language: "en", voiceRole: "player" });
      practiceLines.set(`${clue.id}-f`, { sceneId: scene.id, phrase: clue.followUp.phrase, language: speechLanguage, voiceRole });
      quizLines.set(`${clue.id}-fe`, { phrase: clue.followUp.prompt, language: "en", voiceRole });
    }
  }
}

function practiceWords(clueId: string) {
  return vocabulary.get(clueId) ?? [];
}

export const world = scenes.map((catalogScene, index) => {
  const { hints: _hints, clues, questions, ...scene } = catalogScene;
  return {
    ...scene,
    requiredBadges: scene.id === echoBasin.id ? 1 : Math.max(0, index >= 3 ? index - 2 : index - 1),
    audioRevision: createHash("sha256").update(JSON.stringify([
      "character-dialogue-v3", speechLanguage, process.env.ELEVENLABS_VOICE_ID, process.env.ELEVENLABS_CHARACTER_VOICES, process.env.ELEVENLABS_MODEL_ID,
      clues.map((clue) => openingFor(catalogScene, clue)),
      clues.map(({ phrase, replies, followUp }) => [phrase, replies?.map((reply) => [reply.phrase, reply.prompt, reply.acknowledgment]), followUp?.phrase, followUp?.prompt, followUp?.translation]),
      questions.map(({ phrase }) => phrase),
    ])).digest("hex").slice(0, 16),
    clues: clues.map(({ replies, followUp, ...clue }, clueIndex) => ({
      ...clue,
      emotionalContext: analyzeEmotionalContext(clue),
      opening: clue.signal ? undefined : openingFor(catalogScene, catalogScene.clues[clueIndex]),
      replies: replies?.map((reply, index) => ({
        ...reply,
        acknowledgment: replyAcknowledgment(catalogScene, catalogScene.clues[clueIndex], reply),
        id: `${clue.id}-r${index}`,
        promptAudioId: `${clue.id}-e${index}`,
        acknowledgmentAudioId: `${clue.id}-a${index}`,
      })),
      followUp: followUp && { ...followUp, id: `${clue.id}-f`, promptAudioId: `${clue.id}-fe` },
      practice: practiceWords(clue.id),
    })),
    questions: questions.map(({ prompt, options, phrase, pronunciation, glosses, signal }, questionIndex) => ({
      prompt, options, phrase, pronunciation,
      glosses, signal,
      audioId: phrase && !signal ? `${scene.id}-quiz-${questionIndex}` : undefined,
    })),
  };
});
