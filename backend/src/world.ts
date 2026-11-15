import { evolveLanguages } from "./evolution.js";

type Clue = { id: string; speaker: string; context: string; phrase: string; speech: string; pronunciation?: string };
type Question = { prompt: string; options: string[]; answer: number; phrase?: string; pronunciation?: string };
type Scene = { id: string; title: string; language: string; description: string; clues: Clue[]; questions: Question[]; hints: string[] };

function french(id: string, speaker: string, context: string, phrase: string): Clue {
  return { id, speaker, context, phrase, speech: phrase };
}

const market: Scene = {
  id: "market",
  title: "The Market",
  language: "French",
  description: "A food shipment is missing its labels. Visit the stalls and help the quartermaster check its manifest.",
  clues: [
    french("apple-one", "Merchant", "She holds up one apple.", "Une pomme."),
    french("apple-two", "Merchant", "She adds a second apple.", "Deux pommes."),
    french("bread-one", "Baker", "He holds up one loaf.", "Un pain."),
    french("bread-three", "Baker", "He lines up three loaves.", "Trois pains."),
    french("loading-apples", "Quartermaster", "She loads the apples.", "Je charge les pommes."),
    french("loading-bread", "Quartermaster", "She loads the bread.", "Je charge les pains."),
  ],
  questions: [
    { prompt: "Which word names the fruit?", options: ["pain", "pomme", "deux"], answer: 1 },
    { prompt: "How many loaves does the baker offer?", phrase: "Trois pains.", options: ["Three", "Two", "One"], answer: 0 },
    { prompt: "What is the quartermaster doing?", phrase: "Je charge les pains.", options: ["Buying fruit", "Selling bread", "Loading bread"], answer: 2 },
    { prompt: "Which label belongs on a crate with two loaves?", options: ["Trois pommes", "Deux pains", "Un pain"], answer: 1 },
  ],
  hints: ["Compare the merchant's quantities, then look for the word that changes when the quartermaster loads something different."],
};

// Geometric marks represent sound segments. The IPA and French TTS spellings are
// separate so changes to the writing system never change the spoken phrase.
const sounds: Record<string, [glyph: string, ipa: string, speech: string]> = {
  p:["◧","p","p"], l:["◫","l","l"], t:["◩","t","t"], m:["◇","m","m"],
  v:["◭","v","v"], r:["◕","ʁ","r"], k:["◬","k","k"], sh:["◈","ʃ","ch"],
  z:["◆","z","z"], f:["◪","f","f"], d:["◨","d","d"], b:["◮","b","b"],
  s:["◍","s","s"], ch:["◐","t͡ʃ","tch"], n:["◒","n","n"],
  a:["△","a","a"], e:["○","ɛ","è"], i:["□","i","i"], o:["▽","ɔ","o"],
  u:["⬡","y","u"], ai:["◁","ɛj","eï"], oo:["▷","u","ou"],
  eu:["◯","ø","eu"], zh:["◉","ʒ","j"], ng:["◓","ŋ","ng"],
};

function render(form: string) {
  const words = form.split(" ").map((word) =>
    (word.match(/sh|ch|zh|ng|ai|oo|eu|[a-z]/g) ?? []).map((token) => sounds[token]));
  return {
    phrase: words.map((word) => word.map(([glyph]) => glyph).join("")).join(" · "),
    pronunciation: words.map((word) => word.map(([, ipa]) => ipa).join("")).join(" "),
    speech: words.map((word) => word.map(([, , speech]) => speech).join("")).join(" "),
  };
}

function alienScene(id: string, title: string, language: string, roots: string[], pluralize: (word: string) => string, order: number): Scene {
  const [lantern, star, , carry, see, scout] = roots;
  const clause = (verb: string, object: string) => [
    [scout, object, verb], [verb, scout, object], [scout, verb, object],
  ][order].join(" ");
  const clue = (key: string, speaker: string, context: string, form: string): Clue => ({
    id: id === "outpost" ? key : `${id}-${key}`, speaker, context, ...render(form),
  });
  const manyStars = pluralize(star);
  return {
    id, title, language,
    description: "A storm is coming. Follow the locals from the lantern stand to the gate and learn how to read their supply orders.",
    clues: [
      clue("lantern-one", "Lamplighter", "They raise one lantern.", lantern),
      clue("lantern-many", "Lamplighter", "They hang several lanterns on a line.", pluralize(lantern)),
      clue("star-one", "Scout", "The scout points at a star-shaped marker.", star),
      clue("star-many", "Scout", "The scout points at a pile of star markers.", manyStars),
      clue("carry-lantern", "Gatekeeper", "The scout carries a lantern through the gate.", clause(carry, lantern)),
      clue("see-lantern", "Gatekeeper", "The scout spots a lantern and leaves it where it is.", clause(see, lantern)),
      clue(id === "outpost" ? "gate" : "test", "Gatekeeper", "The scout carries a pile of star markers.", clause(carry, manyStars)),
    ],
    questions: [
      { prompt: "Which object does this sign name?", ...render(star), options: ["Lantern", "Gate", "Star marker"], answer: 2 },
      { prompt: "What quantity does this order request?", ...render(pluralize(lantern)), options: ["One lantern", "Several lanterns", "Several stars"], answer: 1 },
      { prompt: "The scout spots several star markers. Which order describes that?", options: [
        render(clause(see, manyStars)).phrase, render(clause(carry, manyStars)).phrase, render(clause(see, star)).phrase,
      ], answer: 0 },
      { prompt: "Translate this new supply order.", ...render(clause(carry, pluralize(lantern))),
        options: ["The scout sees several lanterns", "The scout carries one lantern", "The scout carries several lanterns"], answer: 2 },
    ],
    hints: ["First compare one object with many. Then compare the two sentences about a lantern to isolate the action word."],
  };
}

const generated = evolveLanguages().map(({ roots, pluralize }, index) => {
  const name = roots[2];
  const scene = alienScene(`planet-${index + 1}`, name[0].toUpperCase() + name.slice(1), `${name.toUpperCase()} dialect`,
    roots, pluralize, index % 3);
  scene.questions = scene.questions.map((question, position) => {
    const size = question.options.length;
    const offset = (index + position) % size;
    return {
      ...question,
      options: [...question.options.slice(offset), ...question.options.slice(0, offset)],
      answer: (question.answer - offset + size) % size,
    };
  });
  return scene;
});

export const scenes = [
  market,
  alienScene("outpost", "The Outpost", "Lantern Cant", ["vek", "tor", "mer", "chal", "shu", "zan"], (word) => `ri-${word}`, 1),
  ...generated,
];

export const world = scenes.map(({ hints: _hints, clues, questions, ...scene }, index) => ({
  ...scene,
  requiredBadges: Math.max(0, index - 1),
  clues: clues.map(({ speech: _speech, ...clue }) => clue),
  questions: questions.map(({ answer: _answer, prompt, options, phrase, pronunciation }) => ({ prompt, options, phrase, pronunciation })),
}));

export const lines = new Map<string, { speech: string; language: string }>();
for (const scene of scenes) {
  for (const clue of scene.clues) lines.set(clue.id, { speech: clue.speech, language: "fr" });
}
