import { createLanguage } from "./language/grammar.js";
import type { Clue, Question, Scene } from "./world.js";

type Prop = "lantern" | "marker" | "apple" | "bread" | "crate";
type Cargo = [singular: string, plural: string, prop: Prop];
type Mission = [setting: string, problem: string, actor: string, first: Cargo, second: Cargo, verbs: [string, string, string]];
type Task = { object: number; action: number; many: boolean; earlier?: boolean; hearsay?: boolean; paired?: boolean };
const missions: Mission[] = [
  ["ice docks", "A freighter needs supplies before the tide freezes.", "dockhand", ["heater", "heaters", "lantern"], ["fuel cell", "fuel cells", "crate"], ["sorts", "loads", "checks"]],
  ["orchard domes", "The harvest bins lost their labels during the night.", "gardener", ["pear", "pears", "apple"], ["seed pod", "seed pods", "crate"], ["picks", "packs", "counts"]],
  ["salt flats", "A survey crew needs to mark a safe route home.", "ranger", ["flag", "flags", "marker"], ["flare", "flares", "lantern"], ["spots", "plants", "retrieves"]],
  ["reef station", "A diver is preparing gear for a rescue below the reef.", "diver", ["air canister", "air canisters", "crate"], ["beacon", "beacons", "marker"], ["checks", "takes", "returns"]],
  ["cinder terraces", "The bakery is sending food to a shelter uphill.", "baker", ["flatbread", "flatbreads", "bread"], ["emberfruit", "emberfruit", "apple"], ["makes", "wraps", "shares"]],
  ["glass gardens", "The greenhouse crew is preparing for a power cut.", "grower", ["grow lamp", "grow lamps", "lantern"], ["seed tray", "seed trays", "crate"], ["tests", "brings", "stores"]],
  ["signal ridge", "The ridge crew needs to warn nearby villages of a storm.", "lookout", ["signal mirror", "signal mirrors", "marker"], ["backup light", "backup lights", "lantern"], ["finds", "raises", "lowers"]],
  ["floating bazaar", "A courier is gathering a delivery for the lower platforms.", "courier", ["rice cake", "rice cakes", "bread"], ["parcel", "parcels", "crate"], ["buys", "delivers", "opens"]],
  ["copper marsh", "A field crew is checking the boardwalk after a flood.", "warden", ["depth marker", "depth markers", "marker"], ["sample jar", "sample jars", "crate"], ["inspects", "moves", "labels"]],
  ["dust observatory", "The observatory lens is failing just before an eclipse.", "technician", ["lens", "lenses", "marker"], ["battery", "batteries", "crate"], ["cleans", "replaces", "tests"]],
  ["river locks", "Someone needs to tell the lock crew which gear reached the lower gate.", "keeper", ["key", "keys", "marker"], ["hand lamp", "hand lamps", "lantern"], ["finds", "uses", "returns"]],
  ["fern vault", "The seed vault must finish a stocktake before resealing.", "archivist", ["fern sample", "fern samples", "apple"], ["spore vial", "spore vials", "crate"], ["records", "moves", "counts"]],
  ["moonrail depot", "The last train is waiting for a maintenance handoff.", "conductor", ["ticket", "tickets", "marker"], ["toolbox", "toolboxes", "crate"], ["checks", "delivers", "collects"]],
  ["echo caves", "The cave team needs to report what they left at the entrance.", "guide", ["rope coil", "rope coils", "crate"], ["trail lamp", "trail lamps", "lantern"], ["takes", "leaves", "finds"]],
  ["aurora clinic", "A medic is tracing where the emergency supplies went.", "medic", ["bandage", "bandages", "bread"], ["cold pack", "cold packs", "crate"], ["opens", "uses", "restocks"]],
  ["saffron terraces", "The terraces are setting up for a communal meal.", "cook", ["spiced roll", "spiced rolls", "bread"], ["citrus fruit", "citrus fruits", "apple"], ["cuts", "serves", "saves"]],
  ["tether station", "The crew must send a repair kit across a damaged tether.", "engineer", ["clamp", "clamps", "marker"], ["seal kit", "seal kits", "crate"], ["selects", "sends", "secures"]],
  ["blue quarry", "Conflicting reports have held up the afternoon shift.", "miner", ["ore sample", "ore samples", "crate"], ["survey peg", "survey pegs", "marker"], ["finds", "marks", "removes"]],
  ["cloud farm", "A forecast and an eyewitness account disagree about the harvest.", "farmer", ["nectar jar", "nectar jars", "crate"], ["cloudberry", "cloudberries", "apple"], ["gathers", "stores", "shares"]],
  ["paper moon", "Two storytellers remember the same delivery differently.", "scribe", ["letter", "letters", "marker"], ["wax tablet", "wax tablets", "crate"], ["writes", "delivers", "reads"]],
  ["night crossing", "A caravan is deciding which reports it can trust.", "traveler", ["route stone", "route stones", "marker"], ["night lantern", "night lanterns", "lantern"], ["spots", "places", "carries"]],
  ["broken ring", "The station needs an exact record of its emergency repairs.", "mechanic", ["circuit board", "circuit boards", "crate"], ["junction tag", "junction tags", "marker"], ["inspects", "connects", "replaces"]],
  ["storm piers", "Incoming waves are forcing a change of plans at the piers.", "sailor", ["mooring line", "mooring lines", "crate"], ["storm light", "storm lights", "lantern"], ["checks", "secures", "retrieves"]],
  ["quiet archive", "The keepers are separating firsthand records from rumors.", "keeper", ["voice reel", "voice reels", "crate"], ["catalog slip", "catalog slips", "marker"], ["records", "copies", "verifies"]],
  ["last beacon", "The final outpost needs a coded handoff before it can transmit.", "operator", ["transmitter", "transmitters", "lantern"], ["relay core", "relay cores", "crate"], ["finds", "installs", "tests"]],
];
const oldKeys = ["lantern-one", "lantern-many", "star-one", "star-many", "carry-lantern", "see-lantern", "test"];
const names = ["Ari", "Nima", "Vesa", "Tavi", "Sena", "Miro", "Ilo", "Rumi", "Pava", "Daro", "Luma"];
const irregularPast: Record<string, string> = {
  brings: "brought", buys: "bought", finds: "found", leaves: "left", makes: "made",
  reads: "read", sends: "sent", takes: "took", writes: "wrote", cuts: "cut",
  carries: "carried", verifies: "verified", copies: "copied", spots: "spotted", wraps: "wrapped",
};

function pastTense(verb: string) {
  const base = /(?:[sc]hes|sses|xes|zzes)$/u.test(verb) ? verb.slice(0, -2) : verb.replace(/s$/u, "");
  return irregularPast[verb] ?? (base.endsWith("e") ? `${base}d` : `${base}ed`);
}

export function createMission(index: number, title: string, family: number): Scene {
  const id = `planet-${index + 1}`;
  const [setting, problem, actor, first, second, verbs] = missions[index];
  const { name: languageName, compose, grammar } = createLanguage(id, `${title}i`, index + 3, family, [
    ...[actor, first[0], second[0]].map((meaning) => ({ category: "noun" as const, meaning })),
    ...verbs.map((meaning) => ({ category: "verb" as const, meaning })),
  ]);
  const tier = Math.floor(index / 5);
  const speakers = [0, 1, 2].map((offset) => names[(index * 3 + offset * 4) % names.length]);
  const tasks: Task[] = [
    { object: 0, action: 0, many: false },
    { object: 0, action: 0, many: true },
    { object: 1, action: 1, many: false },
    { object: 1, action: 1, many: true },
    { object: 0, action: 2, many: true, earlier: tier >= 2 },
    { object: 1, action: 2, many: false, earlier: tier >= 2, hearsay: tier >= 3 },
    { object: 1, action: 0, many: true, earlier: tier >= 2, hearsay: false, paired: tier >= 4 },
  ];
  function line(task: Task) {
    const cargo = task.object === 0 ? first : second;
    const meaning = task.many ? cargo[1] : cargo[0];
    const otherCargo = task.object === 0 ? second : first;
    const sentence = compose({
      subject: actor, action: verbs[task.action], time: task.earlier ? "earlier" : undefined,
      source: task.hearsay === undefined || tier < 3 ? undefined : task.hearsay ? "reported" : "witnessed",
      objects: [
        { noun: cargo[0], plural: cargo[1], quantity: task.many ? "several" : 1 },
        ...(task.paired ? [{ noun: otherCargo[0], quantity: 1 as const }] : []),
      ],
    });
    const article = (value: string) => /^[aeiou]/i.test(value) ? "an" : "a";
    const other = (task.object === 0 ? second : first)[0];
    const verb = task.earlier ? pastTense(verbs[task.action]) : verbs[task.action];
    const translation = `${task.hearsay === true ? "Reportedly, the" : task.hearsay === false && tier >= 3 ? "I saw it myself: the" : "The"} ${actor} ${verb} ${task.many ? `several ${meaning}` : `${article(meaning)} ${meaning}`}${task.paired ? ` and ${article(other)} ${other}` : ""}${task.earlier ? " earlier" : ""}.`;
    return { ...sentence, translation };
  }

  const prompts = [
    `You're the traveler from the ship, right? We could use a hand at the ${setting}.`, "Now look again. How many are there?",
    `I'm glad you're here. Let's talk about the ${second[1]} next.`, "Can you tell someone how many I've got?",
    "Let's check what went where.", "Listen closely. The details matter here.",
    "One last handoff. Show me you've got it.",
  ];
  const acknowledgments = [
    "That's it. Now compare it with the next one.", "You caught the difference. Good eye.",
    "Exactly. Now you know what to call it.", "Perfect. I'll take that count.",
    "Right. That's the detail I needed.", "You heard me correctly. Thanks for checking.",
    "We've got what we need. I'll radio your ship.",
  ];
  const clues: Clue[] = tasks.map((task, i) => {
    const cargo = task.object === 0 ? first : second;
    const changeSource = tier >= 3 && task.hearsay !== undefined;
    const changeTime = tier >= 2 && task.earlier && !changeSource;
    const replyTask = changeSource ? { ...task, hearsay: !task.hearsay }
      : changeTime ? { ...task, earlier: false } : { ...task, many: !task.many };
    const replyPrompt = changeSource ? "Now change how you know it happened." : changeTime
      ? "Now tell me what is happening right now." : "Change the quantity and tell me the new line.";
    const model = line(task);
    const updated = { ...task, action: (task.action + 2) % verbs.length };
    const followUp = line(updated);
    return {
      id: `${id}-${oldKeys[i]}`, speaker: speakers[Math.min(2, Math.floor(i / 2))],
      context: prompts[i],
      observation: { label: `${task.many ? "Several" : "One"} ${task.many ? cargo[1] : cargo[0]}`, prop: cargo[2], count: task.many ? 3 : 1, action: (["show", "carry", "see"] as const)[task.action] },
      ...model,
      followUp: {
        ...followUp,
        prompt: `Before you go, the ${actor} has an update. What changed?`,
        alternatives: [model.translation, line({ ...updated, many: !updated.many }).translation],
      },
      replies: [
        { ...line(replyTask), choice: changeSource ? "Change the source" : changeTime ? "Change the time" : "Give a new count",
          prompt: replyPrompt, acknowledgment: acknowledgments[i] },
        { ...line({ ...task, earlier: tier >= 2 ? !task.earlier : undefined, many: tier < 2 ? !task.many : task.many, action: (task.action + 1) % verbs.length }),
          choice: "Try a different action", prompt: "Let's tell the crew what else happened.",
          acknowledgment: "You changed the action correctly. I can pass that along to the crew." },
      ],
    };
  });
  const extraTasks: Task[] = [
    { ...tasks[1], action: 1 },
    { ...tasks[2], action: 2 },
    { ...tasks[4], many: false },
    { ...tasks[4], object: 1, many: true },
    { ...tasks[5], object: 0 },
    { ...tasks[6], action: 2, many: true },
  ];
  const quizTasks = [tasks[0], tasks[3], tasks[5], { ...tasks[6], action: 1 }, ...extraTasks.slice(0, Math.floor(index / 4))];
  const questions: Question[] = quizTasks.map((task, i) => {
    const correct = line(task);
    const distractors = [
      line({ ...task, many: !task.many }).translation,
      line(i === 3 && tier >= 3 ? { ...task, hearsay: !task.hearsay } : { ...task, action: (task.action + 1) % 3 }).translation,
    ];
    if (tier >= 1) distractors.push(line({ ...task, object: 1 - task.object }).translation);
    if (tier >= 2 && i > 1) distractors.push(line({ ...task, earlier: !task.earlier }).translation);
    const answer = (index + i) % (distractors.length + 1);
    distractors.splice(answer, 0, correct.translation);
    return { ...correct, prompt: ["Translate the opening line.", "Listen for the quantity.", "Translate the handoff exactly.", "Decode a new handoff for the crew."][i] ?? "Translate this new line from the crew.", options: distractors, answer };
  });
  const lessonGrammar = [grammar.basics, tier >= 2 && grammar.time, tier >= 3 && grammar.source, tier >= 4 && grammar.linked].filter(Boolean).join(" ");
  return {
    id, title, language: languageName, region: (["harbor", "highland", "dune"] as const)[family],
    description: `At the ${setting}, ${problem.charAt(0).toLowerCase() + problem.slice(1)}`,
    mission: { briefing: problem, difficulty: index + 3, grammar: lessonGrammar },
    clues, questions, hints: [lessonGrammar],
  };
}
