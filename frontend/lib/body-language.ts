export type GestureName = "Open_Palm" | "Thumb_Up" | "Pointing_Up" | "Victory";
export const signalIds = ["welcome", "wait", "ready", "attention", "two"] as const;
export type SignalId = typeof signalIds[number];
export type BodyLanguageProgress = { learned: SignalId[]; practiced: SignalId[] };

export const bodyLanguageLessons: {
  id: SignalId; title: string; context: string; gesture: GestureName; gestureLabel: string;
  options: string[]; answer: number; explanation: string; instruction: string; response: string;
}[] = [
  {
    id: "welcome", title: "A welcome at the market", gesture: "Open_Palm", gestureLabel: "Open palm",
    context: "The merchant notices you arriving, turns toward you, and raises an open hand beside their face.",
    options: ["Hello. Come and talk.", "Bring two apples.", "I have finished loading."], answer: 0,
    explanation: "Here, the open hand starts a friendly interaction. The arrival and the merchant’s attention help you read it as a greeting.",
    instruction: "Raise one hand with all five fingers open and your palm facing the camera. Hold it still for a moment.",
    response: "The merchant returns your greeting. A conversation can begin without a word.",
  },
  {
    id: "wait", title: "Pause at the loading bay", gesture: "Open_Palm", gestureLabel: "Open palm",
    context: "You approach while the quartermaster moves a heavy crate across your path. They extend an open palm toward you.",
    options: ["The cargo belongs to you.", "Wait here until the path is clear.", "Choose a new planet."], answer: 1,
    explanation: "The same hand shape now asks for a pause. A greeting and a request to wait can look similar; the situation supplies the difference.",
    instruction: "Hold an open palm toward the camera with your fingers extended. Imagine asking someone to pause before the crate passes.",
    response: "The quartermaster waits for the path to clear, then invites you through.",
  },
  {
    id: "ready", title: "Ready for departure", gesture: "Thumb_Up", gestureLabel: "Thumbs up",
    context: "The survey pilot asks whether your supplies are packed. Your crew has agreed that a raised thumb means ready.",
    options: ["I need two more crates.", "Please stop talking.", "Yes. I am ready."], answer: 2,
    explanation: "A shared signal can confirm a plan. This crew has agreed on its meaning; gestures can mean different things in other communities.",
    instruction: "Close your fingers and point your thumb upward. Face the side of your hand toward the camera so the thumb is visible.",
    response: "The pilot acknowledges your signal and begins the departure checks.",
  },
  {
    id: "attention", title: "A question for the guide", gesture: "Pointing_Up", gestureLabel: "Raised index finger",
    context: "During a briefing, your guide asks everyone to raise one finger if they want a turn to ask a question.",
    options: ["I would like a turn to speak.", "The route is closed.", "I have three lanterns."], answer: 0,
    explanation: "Body language can manage whose turn it is to communicate. The guide’s instructions establish what this raised finger means.",
    instruction: "Point your index finger upward and curl the other fingers into your palm. Keep the whole hand in view.",
    response: "The guide gives you the next turn. Your signal helped the group listen.",
  },
  {
    id: "two", title: "Two markers, please", gesture: "Victory", gestureLabel: "Two raised fingers",
    context: "The scout holds up a star marker and asks how many you need. You raise your index and middle fingers.",
    options: ["I do not need any.", "I need two markers.", "I will return tomorrow."], answer: 1,
    explanation: "In this exchange, two fingers answer a quantity question. In another setting the same shape might signal peace or victory.",
    instruction: "Raise your index and middle fingers in a V and fold the remaining fingers. Keep your palm facing the camera.",
    response: "The scout hands you two markers. You answered a practical question without speaking.",
  },
];

export const gestureLabels: Record<string, string> = {
  Open_Palm: "open palm", Thumb_Up: "thumbs up", Pointing_Up: "raised index finger", Victory: "two raised fingers",
  Closed_Fist: "closed fist", Thumb_Down: "thumbs down", ILoveYou: "an I-love-you hand shape",
};

export function isSignalList(value: unknown): value is SignalId[] {
  return Array.isArray(value) && value.length <= signalIds.length
    && new Set(value).size === value.length && value.every(id => signalIds.includes(id as SignalId));
}

export function isBodyLanguageProgress(value: unknown): value is BodyLanguageProgress {
  if (!value || typeof value !== "object") return false;
  const progress = value as Partial<BodyLanguageProgress>;
  return isSignalList(progress.learned) && isSignalList(progress.practiced);
}
