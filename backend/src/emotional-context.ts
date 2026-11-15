import type { Clue } from "./world.js";

export type EmotionalContext = { tone: string; reading: string };

type VoiceProfile = { tone: string; trait: string; pace: "quick" | "measured" | "steady" };

// These descriptions follow the voice character and delivery settings used by ElevenLabs.
const voiceProfiles: Readonly<Record<string, VoiceProfile>> = {
  Merchant: { tone: "Warm and upbeat", trait: "welcoming", pace: "quick" },
  Baker: { tone: "Gentle and unhurried", trait: "reassuring", pace: "measured" },
  Quartermaster: { tone: "Focused and confident", trait: "practical", pace: "steady" },
  Lamplighter: { tone: "Gentle and steady", trait: "reassuring", pace: "measured" },
  Scout: { tone: "Eager and curious", trait: "enthusiastic", pace: "quick" },
  Gatekeeper: { tone: "Measured and cautious", trait: "deliberate", pace: "measured" },
};

function analyzeBodyLanguage(clue: Clue): EmotionalContext {
  const evidence = `${clue.phrase} ${clue.context}`.toLowerCase();
  if (/crouch|wait|dust|hold/u.test(evidence)) {
    return { tone: "Cautious direction", reading: "The crouch and pause suggest care around a possible hazard; the point gives a clear route." };
  }
  if (/point|gesture|direct/u.test(evidence)) {
    return { tone: "Direct instruction", reading: "A clear pointing gesture reads as a practical direction." };
  }
  if (/carv|glyph|inscri/u.test(evidence)) {
    return { tone: "Deliberate instruction", reading: "Carefully making each sign suggests a considered, practical message." };
  }
  return { tone: "Measured report", reading: "The steady signal and action read as an informative report." };
}

/** Infer a suggested emotional reading from the generated voice character or visible action cues. */
export function analyzeEmotionalContext(clue: Clue): EmotionalContext {
  if (clue.signal) return analyzeBodyLanguage(clue);

  const profile = voiceProfiles[clue.speaker];
  const evidence = `${clue.translation ?? ""} ${clue.context}`.toLowerCase();
  const subject = /help|welcome|morning|glad|come closer/u.test(evidence)
    ? "a friendly invitation"
    : /load|shipment|manifest|check|supply|label/u.test(evidence)
      ? "a practical task"
      : /show|hold|count|carry/u.test(evidence)
        ? "sharing an observation"
        : "the situation";

  if (!profile) {
    return { tone: "Curious and observant", reading: `The line focuses on ${subject}, suggesting an attentive, engaged speaker.` };
  }

  const pace = profile.pace === "quick" ? "lively" : profile.pace === "measured" ? "measured" : "crisp";
  return {
    tone: profile.tone,
    reading: `The ${pace} voice sounds ${profile.trait} while talking about ${subject}. This is a suggested reading of the generated voice, words, and situation.`,
  };
}
