import { createLexicon, pronunciationOf } from "./lexicon.js";
import { evolveGrammar, type Concept } from "./genetics.js";

export type Quantity = 1 | 2 | 3 | "several";
export type ObjectPhrase = { noun: string; plural?: string; quantity?: Quantity };
export type Clause = {
  subject?: string;
  action: string;
  objects: ObjectPhrase[];
  time?: "earlier";
  source?: "reported" | "witnessed";
};

const quantities = { 1: "one", 2: "two", 3: "three", several: "several" } as const;
const roles = { s: "Subject", v: "Action", o: "Object" } as const;
export function createLanguage(id: string, name: string, rank: number, family: number, vocabulary: readonly Concept[]) {
  const { genome } = evolveGrammar(id, rank, family, vocabulary);
  const lexeme = createLexicon(id, genome);
  const order = [...genome.order] as (keyof typeof roles)[];
  const numberAfter = genome.quantity === "after" || genome.quantity === "suffix";
  const boundNumber = genome.quantity === "prefix" || genome.quantity === "suffix";
  const { timeFirst, sourceFirst } = genome;
  const grammar = {
    basics: `${order.map((part) => roles[part]).join(" → ")}. ${boundNumber
      ? `A quantity marker attaches to the ${numberAfter ? "end" : "start"} of its noun.`
      : `Quantity goes ${numberAfter ? "after" : "before"} its noun.`}`,
    time: `The time word goes ${timeFirst ? "before" : "after"} the action.`,
    source: `The ${sourceFirst ? "first" : "last"} word marks a report or a firsthand account.`,
    linked: "The connector joins two objects.",
  };

  type Token = { form: string; meaning: string; role: string };
  const particle = (meaning: string, role: string): Token => ({ form: lexeme("particle", meaning), meaning, role });

  function compose({ subject, action, objects, time, source }: Clause) {
    const actor: Token[] = subject ? [{ form: lexeme("noun", subject), meaning: subject === "I" ? subject : `the ${subject}`, role: "Subject" }] : [];
    const verb: Token[] = [{ form: lexeme("verb", action), meaning: action, role: subject ? "Action" : "Points out" }];
    if (time) verb.splice(timeFirst ? 0 : verb.length, 0, particle(time, "Time"));
    const object: Token[] = objects.flatMap(({ noun, plural, quantity }, index) => {
      const item = { form: lexeme("noun", noun), meaning: quantity && quantity !== 1 ? plural ?? noun : noun, role: "Object" };
      const group = [item];
      if (quantity) {
        const number = particle(quantities[quantity], "Quantity");
        if (boundNumber) {
          item.form = numberAfter ? item.form + number.form : number.form + item.form;
          item.meaning = `${number.meaning} ${item.meaning}`;
          item.role = "Quantity + object";
        } else {
          group.splice(numberAfter ? 1 : 0, 0, number);
        }
      }
      return index ? [particle("and", "Connector"), ...group] : group;
    });
    const parts = { s: actor, v: verb, o: object };
    const words = order.flatMap((part) => parts[part]);
    if (source) words.splice(sourceFirst ? 0 : words.length, 0, particle(source, "Source"));
    const form = words.map(({ form }) => form).join(" ");
    return {
      phrase: form.charAt(0).toUpperCase() + form.slice(1) + ".",
      pronunciation: words.map(({ form }) => pronunciationOf(form)).join(" "),
      glosses: words.map(({ meaning }) => meaning),
      roles: words.map(({ role }) => role),
    };
  }

  return { name, grammar, compose };
}
