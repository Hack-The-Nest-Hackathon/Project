type Observation = { label: string; prop: "apple" | "bread" | "lantern" | "marker"; count: number; action: "show" | "load" | "carry" | "see" };
import { evolveLanguages } from "./evolution.js";

type Clue = { id: string; speaker: string; context: string; phrase: string; speech: string; pronunciation?: string; translation?: string; glosses?: string[]; observation?: Observation };
type Question = {
  prompt: string; options: string[]; answer: number; phrase?: string; pronunciation?: string;
  speech?: string; glosses?: string[];
};
type Scene = { id: string; title: string; language: string; description: string; dialect?: string; clues: Clue[]; questions: Question[]; hints: string[] };

const frenchGlosses: Record<string, string> = {
  voici: "here is / here are", une: "one / a", un: "one / a", deux: "two", trois: "three",
  pomme: "apple", pommes: "apples", pain: "loaf of bread", pains: "loaves of bread",
  je: "I", charge: "load", les: "the", et: "and",
};

function french(id: string, speaker: string, context: string, phrase: string, translation: string, observation: Observation): Clue {
  const glosses = phrase.toLowerCase().match(/\p{L}+/gu)?.map((word) => frenchGlosses[word]);
  return { id, speaker, context, phrase, speech: phrase, translation, glosses, observation };
}

const market: Scene = {
  id: "market",
  title: "The Market",
  language: "French",
  description: "A food shipment is missing its labels. Visit the stalls and help the quartermaster check its manifest.",
  clues: [
    french("apple-one", "Merchant", "She holds up one apple.", "Voici une pomme.", "Here is an apple.", { label: "One apple", prop: "apple", count: 1, action: "show" }),
    french("apple-two", "Merchant", "She adds a second apple.", "Voici deux pommes.", "Here are two apples.", { label: "Two apples", prop: "apple", count: 2, action: "show" }),
    french("bread-one", "Baker", "He holds up one loaf.", "Voici un pain.", "Here is a loaf of bread.", { label: "One loaf", prop: "bread", count: 1, action: "show" }),
    french("bread-three", "Baker", "He lines up three loaves.", "Voici trois pains.", "Here are three loaves of bread.", { label: "Three loaves", prop: "bread", count: 3, action: "show" }),
    french("loading-apples", "Quartermaster", "She loads the apples.", "Je charge les pommes.", "I load the apples.", { label: "Load the apples", prop: "apple", count: 2, action: "load" }),
    french("loading-bread", "Quartermaster", "She loads the bread.", "Je charge les pains.", "I load the bread.", { label: "Load the bread", prop: "bread", count: 3, action: "load" }),
  ],
  questions: [
    { prompt: "Translate this introduction.", phrase: "Voici une pomme.", options: ["Here is a loaf of bread.", "Here is an apple.", "Here are two apples."], answer: 1 },
    { prompt: "Translate the baker’s sentence.", phrase: "Voici trois pains.", options: ["Here are three loaves of bread.", "Here are two loaves of bread.", "Here is a loaf of bread."], answer: 0 },
    { prompt: "Translate what the quartermaster says.", phrase: "Je charge les pains.", options: ["I buy the fruit.", "I sell the bread.", "I load the bread."], answer: 2 },
    { prompt: "Translate this new sentence using both stalls’ clues.", phrase: "Je charge deux pains et une pomme.", options: ["I load three apples and a loaf of bread.", "I load two loaves of bread and an apple.", "I load one loaf of bread and two apples."], answer: 1 },
  ],
  hints: ["Compare the merchant's quantities, then look for the word that changes when the quartermaster loads something different."],
};

// Written forms, IPA, and speech synthesis spellings serve different purposes.
const sounds: Record<string, [spelling: string, ipa: string, speech: string]> = {
  p:["p","p","p"], l:["l","l","l"], t:["t","t","t"], m:["m","m","m"],
  v:["v","v","v"], r:["r","ʁ","r"], k:["k","k","k"], sh:["š","ʃ","ch"],
  z:["z","z","z"], f:["f","f","f"], d:["d","d","d"], b:["b","b","b"],
  s:["s","s","s"], ch:["č","t͡ʃ","tch"], n:["n","n","n"],
  a:["a","a","a"], e:["è","ɛ","è"], i:["i","i","i"], o:["o","ɔ","o"],
  u:["ü","y","u"], ai:["ai","ɛj","eï"], oo:["ú","u","ou"],
  eu:["ö","ø","eu"], zh:["ž","ʒ","j"], ng:["ŋ","ŋ","ng"],
};

type Dialect = {
  name: string;
  order: number;
  number: "affix" | "particle" | "echo";
  soundChanges: Record<string, string>;
};

const dialects: Dialect[] = [
  { name: "Harbor speech", order: 1, number: "affix", soundChanges: { r: "l", eu: "e" } },
  { name: "Highland speech", order: 0, number: "particle", soundChanges: { sh: "ch", o: "oo" } },
  { name: "Dune speech", order: 2, number: "echo", soundChanges: { ai: "e", r: "zh" } },
];

type Word = { form: string; meaning: string };

function render(words: Word[], dialect: Dialect) {
  const segments = words.map(({ form }) =>
    (form.match(/sh|ch|zh|ng|ai|oo|eu|[a-z]/g) ?? []).map((token) => sounds[dialect.soundChanges[token] ?? token]));
  const spelling = segments.map((word) => word.map(([letters]) => letters).join("")).join(" ");
  return {
    phrase: spelling.charAt(0).toUpperCase() + spelling.slice(1) + ".",
    pronunciation: segments.map((word) => word.map(([, ipa]) => ipa).join("")).join(" "),
    speech: segments.map((word) => word.map(([, , speech]) => speech).join("")).join(" ") + ".",
    glosses: words.map(({ meaning }) => meaning),
  };
}

function alienScene(id: string, title: string, language: string, roots: string[], pluralize: (word: string) => string, dialect: Dialect): Scene {
  const [lantern, star, , carry, see, scout] = roots;
  const word = (form: string, meaning: string): Word => ({ form, meaning });
  const noun = (root: string, meaning: string, plural = false): Word[] => {
    if (!plural) return [word(root, meaning)];
    if (dialect.number === "echo") return [word(`${root}${root}`, `several ${meaning}s`)];
    const inflected = pluralize(root);
    if (dialect.number === "affix") return [word(inflected, `several ${meaning}s`)];
    return inflected.split("-").map((part) => word(part, part === root ? meaning : "several"));
  };
  const clause = (verb: Word, object: Word[]) => {
    const subject = word(scout, "the scout");
    return [[subject, ...object, verb], [verb, subject, ...object], [subject, verb, ...object]][dialect.order];
  };
  const shows = word("dam", "shows");
  const carries = word(carry, "carries");
  const sees = word(see, "sees");
  const oneLantern = noun(lantern, "lantern");
  const manyLanterns = noun(lantern, "lantern", true);
  const oneStar = noun(star, "star marker");
  const manyStars = noun(star, "star marker", true);
  const clue = (key: string, speaker: string, context: string, words: Word[], translation: string, observation: Observation): Clue => ({
    id: id === "outpost" ? key : `${id}-${key}`, speaker, context, translation, observation, ...render(words, dialect),
  });
  return {
    id, title, language, dialect: dialect.name,
    description: "A storm is coming. Compare what locals say with what they do, then decode a new supply order.",
    clues: [
      clue("lantern-one", "Lamplighter", "The Lamplighter points as the scout raises one lantern.", clause(shows, oneLantern), "The scout shows a lantern.", { label: "One lantern", prop: "lantern", count: 1, action: "show" }),
      clue("lantern-many", "Lamplighter", "This time the scout raises several lanterns.", clause(shows, manyLanterns), "The scout shows several lanterns.", { label: "Several lanterns", prop: "lantern", count: 3, action: "show" }),
      clue("star-one", "Scout", "The scout holds up one star-shaped marker.", clause(shows, oneStar), "The scout shows a star marker.", { label: "One star marker", prop: "marker", count: 1, action: "show" }),
      clue("star-many", "Scout", "The scout holds up several star markers.", clause(shows, manyStars), "The scout shows several star markers.", { label: "Several star markers", prop: "marker", count: 3, action: "show" }),
      clue("carry-lantern", "Gatekeeper", "The scout carries a lantern through the gate.", clause(carries, oneLantern), "The scout carries a lantern.", { label: "Carry a lantern", prop: "lantern", count: 1, action: "carry" }),
      clue("see-lantern", "Gatekeeper", "The scout spots a lantern and leaves it where it is.", clause(sees, oneLantern), "The scout sees a lantern.", { label: "Spot a lantern", prop: "lantern", count: 1, action: "see" }),
      clue(id === "outpost" ? "gate" : "test", "Gatekeeper", "The scout carries a pile of star markers.", clause(carries, manyStars), "The scout carries several star markers.", { label: "Carry several markers", prop: "marker", count: 3, action: "carry" }),
    ],
    questions: [
      { prompt: "Translate the scout’s short sentence.", ...render(clause(shows, oneStar), dialect), options: ["The scout shows a lantern.", "The scout shows several star markers.", "The scout shows a star marker."], answer: 2 },
      { prompt: "Translate the sentence. Watch for the change in quantity.", ...render(clause(shows, manyLanterns), dialect), options: ["The scout shows one lantern.", "The scout shows several lanterns.", "The scout shows several star markers."], answer: 1 },
      { prompt: "Translate this sentence. Look for the action word.", ...render(clause(sees, oneStar), dialect), options: ["The scout sees a star marker.", "The scout carries a star marker.", "The scout sees a lantern."], answer: 0 },
      { prompt: "Translate a new supply order. Combine the action, object, and quantity.", ...render(clause(carries, manyLanterns), dialect),
        options: ["The scout sees several lanterns.", "The scout carries one lantern.", "The scout carries several lanterns."], answer: 2 },
    ],
    hints: ["Compare the two lantern scenes to find the plural pattern. Then compare what changes when the scout sees a lantern or carries it."],
  };
}

const generated = evolveLanguages().map(({ roots, pluralize }, index) => {
  const name = roots[2];
  const scene = alienScene(`planet-${index + 1}`, name[0].toUpperCase() + name.slice(1), `${name.toUpperCase()} dialect`,
    roots, pluralize, dialects[index % dialects.length]);
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
  alienScene("outpost", "The Outpost", "Lantern Cant", ["vek", "tor", "mer", "chal", "shu", "zan"], (word) => `ri-${word}`, dialects[0]),
  ...generated,
];

export const world = scenes.map(({ hints: _hints, clues, questions, ...scene }, index) => ({
  ...scene,
  requiredBadges: Math.max(0, index - 1),
  clues: clues.map(({ speech: _speech, ...clue }) => clue),
  questions: questions.map(({ prompt, options, phrase, pronunciation, glosses }, questionIndex) => ({
    prompt, options, phrase, pronunciation,
    glosses: glosses ?? (scene.id === "market" ? phrase?.toLowerCase().match(/\p{L}+/gu)?.map((word) => frenchGlosses[word]) : undefined),
    audioId: phrase ? `${scene.id}-quiz-${questionIndex}` : undefined,
  })),
}));

export const lines = new Map<string, { speech: string; language: string }>();
export const quizLines = new Map<string, { speech: string; language: string }>();
for (const scene of scenes) {
  for (const clue of scene.clues) lines.set(clue.id, { speech: clue.speech, language: "fr" });
  scene.questions.forEach(({ phrase, speech }, index) => {
    if (phrase) quizLines.set(`${scene.id}-quiz-${index}`, { speech: speech ?? phrase, language: "fr" });
  });
}
