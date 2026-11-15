import { createLanguage, type Clause } from "./language/grammar.js";
import type { Clue, Question, Scene } from "./world.js";

function authoredWorld(id: string, name: string, rank: number, nouns: string[], verbs: string[]) {
  const { compose, grammar } = createLanguage(id, name, rank, rank - 1, [
    ...nouns.map((meaning) => ({ category: "noun" as const, meaning })),
    ...verbs.map((meaning) => ({ category: "verb" as const, meaning })),
  ]);

  function clue(key: string, speaker: string, context: string, sentence: Clause, translation: string, observation: Clue["observation"]): Clue {
    const object = sentence.objects[0];
    const count = object.quantity === 1 ? id === "outpost" ? "several" : 2 : 1;
    const revisedCount = object.quantity === 3 || id === "outpost" ? 2 : 3;
    const number = count === 1 ? "one" : count === 2 ? "two" : "several";
    function meaning(quantity: NonNullable<typeof object.quantity>) {
      const label = { 1: "one", 2: "two", 3: "three", several: "several" }[quantity];
      const cargo = `${label} ${quantity === 1 ? object.noun : object.plural ?? object.noun}`;
      return sentence.subject === "I" ? `I load ${cargo}.`
        : sentence.subject ? `The ${sentence.subject} ${sentence.action} ${cargo}.` : `Here ${quantity === 1 ? "is" : "are"} ${cargo}.`;
    }
    const alternate = meaning(count);
    const model = compose(sentence);
    const follow = compose({ ...sentence, objects: [{ ...object, quantity: revisedCount }] });
    return {
      id: key, speaker, context, translation, observation, ...model,
      followUp: {
        ...follow,
        translation: meaning(revisedCount), alternatives: [translation, alternate],
        prompt: "One last count before I put these away. What did I say this time?",
      },
      replies: [
        { ...model, translation, choice: "Say the line back",
          prompt: "Can you repeat the line so I know you heard me?", acknowledgment: "That's it. You kept the words in the right order." },
        { ...compose({ ...sentence, objects: sentence.objects.map((object) => ({ ...object, quantity: count })) }),
          translation: alternate, choice: `Try ${number}`,
          prompt: `What if there were ${number} instead?`,
          acknowledgment: "You changed the count. Now listen for which words stay the same in my next line." },
      ],
    };
  }
  function quiz(prompt: string, sentence: Clause, options: string[], answer: number): Question {
    return { prompt, options, answer, ...compose(sentence) };
  }
  return { clue, quiz, grammar: grammar.basics };
}

const marketLanguage = "Orchard Cant";
const apples = "apple";
const bread = "loaf of bread";
const market = authoredWorld("market", marketLanguage, 1, ["I", apples, bread], ["here is / here are", "load"]);
const amount = (noun: string, quantity: 1 | 2 | 3) => ({ noun, quantity, plural: noun === bread ? "loaves of bread" : "apples" });
const present = (noun: string, quantity: 1 | 2 | 3): Clause => ({ action: "here is / here are", objects: [amount(noun, quantity)] });
const load = (...objects: Clause["objects"]): Clause => ({ subject: "I", action: "load", objects });

export const marketScene: Scene = {
  id: "market", title: "The Market", language: marketLanguage, region: "harbor",
  description: "A food shipment is missing its labels. Visit the stalls and help the quartermaster check its manifest.",
  mission: { briefing: "Help the quartermaster match the missing labels to the market shipment.", difficulty: 1, grammar: market.grammar },
  clues: [
    market.clue("apple-one", "Merchant", "Welcome to the market! She holds up one apple.", present(apples, 1), "Here is an apple.", { label: "One apple", prop: "apple", count: 1, action: "show" }),
    market.clue("apple-two", "Merchant", "Look again. She adds a second apple.", present(apples, 2), "Here are two apples.", { label: "Two apples", prop: "apple", count: 2, action: "show" }),
    market.clue("bread-one", "Baker", "The baker brushes flour off his apron and holds up one loaf.", present(bread, 1), "Here is a loaf of bread.", { label: "One loaf", prop: "bread", count: 1, action: "show" }),
    market.clue("bread-three", "Baker", "He lines up three loaves. Listen for the new number.", present(bread, 3), "Here are three loaves of bread.", { label: "Three loaves", prop: "bread", count: 3, action: "show" }),
    market.clue("loading-apples", "Quartermaster", "She takes the apples and loads them into the shipment.", load({ noun: apples, plural: "apples", quantity: 2 }), "I load two apples.", { label: "Load the apples", prop: "apple", count: 2, action: "load" }),
    market.clue("loading-bread", "Quartermaster", "She loads the bread next. Watch for the action word you just heard.", load({ noun: bread, plural: "loaves of bread", quantity: 3 }), "I load three loaves of bread.", { label: "Load the bread", prop: "bread", count: 3, action: "load" }),
  ],
  questions: [
    market.quiz("Translate the merchant’s opening line.", present(apples, 1), ["Here is a loaf of bread.", "Here is an apple.", "Here are two apples."], 1),
    market.quiz("Translate the baker’s line.", present(bread, 3), ["Here are three loaves of bread.", "Here are two loaves of bread.", "Here is a loaf of bread."], 0),
    market.quiz("What did the quartermaster say?", load(amount(bread, 3)), ["I load one apple.", "I load two loaves of bread.", "I load three loaves of bread."], 2),
    market.quiz("Translate the new shipment line.", load(amount(bread, 2), amount(apples, 1)), ["I load three apples and a loaf of bread.", "I load two loaves of bread and an apple.", "I load one loaf of bread and two apples."], 1),
  ],
  hints: ["Compare the merchant’s two lines to hear the quantity change. Then listen for the action word at the quartermaster’s stall."],
};

const outpostLanguage = "Lantern Cant";
const lantern = "lantern";
const marker = "star marker";
const outpost = authoredWorld("outpost", outpostLanguage, 2, ["scout", lantern, marker], ["shows", "carries", "sees"]);
const scout = (action: string, noun: string, many = false): Clause => ({
  subject: "scout", action, objects: [{ noun, plural: `${noun}s`, quantity: many ? "several" : 1 }],
});

export const outpostScene: Scene = {
  id: "outpost", title: "The Outpost", language: outpostLanguage, region: "highland",
  description: "The signal crew needs help checking the lantern supply before dark.",
  mission: { briefing: "Listen to the signal crew and cross-check the supply report before the lanterns go out.", difficulty: 2, grammar: outpost.grammar },
  clues: [
    outpost.clue("lantern-one", "Lamplighter", "The lamplighter points as the scout lifts a lantern.", scout("shows", lantern), "The scout shows a lantern.", { label: "One lantern", prop: "lantern", count: 1, action: "show" }),
    outpost.clue("lantern-many", "Lamplighter", "The scout raises several lanterns this time.", scout("shows", lantern, true), "The scout shows several lanterns.", { label: "Several lanterns", prop: "lantern", count: 3, action: "show" }),
    outpost.clue("star-one", "Scout", "The scout holds up a star-shaped marker.", scout("shows", marker), "The scout shows a star marker.", { label: "One marker", prop: "marker", count: 1, action: "show" }),
    outpost.clue("star-many", "Scout", "The scout lets you count a handful of markers.", scout("shows", marker, true), "The scout shows several star markers.", { label: "Several markers", prop: "marker", count: 3, action: "show" }),
    outpost.clue("carry-lantern", "Gatekeeper", "The gatekeeper watches the scout carry a lantern through the gate.", scout("carries", lantern), "The scout carries a lantern.", { label: "Carry a lantern", prop: "lantern", count: 1, action: "carry" }),
    outpost.clue("see-lantern", "Gatekeeper", "The scout spots another lantern and leaves it where it is.", scout("sees", lantern), "The scout sees a lantern.", { label: "Spot a lantern", prop: "lantern", count: 1, action: "see" }),
    outpost.clue("gate", "Gatekeeper", "The scout gathers the markers to carry them to the gate.", scout("carries", marker, true), "The scout carries several star markers.", { label: "Carry markers", prop: "marker", count: 3, action: "carry" }),
  ],
  questions: [
    outpost.quiz("Translate the scout’s short sentence.", scout("shows", marker), ["The scout shows a lantern.", "The scout shows several star markers.", "The scout shows a star marker."], 2),
    outpost.quiz("Listen for the change in quantity.", scout("shows", lantern, true), ["The scout shows one lantern.", "The scout shows several lanterns.", "The scout shows several star markers."], 1),
    outpost.quiz("Listen for the action word.", scout("sees", marker), ["The scout sees a star marker.", "The scout carries a star marker.", "The scout sees a lantern."], 0),
    outpost.quiz("Translate the new supply order.", scout("carries", lantern, true), ["The scout sees several lanterns.", "The scout carries one lantern.", "The scout carries several lanterns."], 2),
  ],
  hints: ["Compare the two lantern lines to spot the quantity word. Then compare what changes when the scout sees a lantern or carries it."],
};
