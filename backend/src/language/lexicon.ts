import { realizeRoot, type Genome } from "./genetics.js";

export const speechLanguage = "fr";

export function createLexicon(id: string, genome: Genome) {
  const entries = new Map<string, string>();
  const spellings = new Set<string>();

  return function lexeme(category: "noun" | "verb" | "particle", meaning: string) {
    const key = `${category}:${meaning.trim().toLowerCase()}`;
    const existing = entries.get(key);
    if (existing) return existing;
    let attempt = 0;
    let form: string;
    do {
      form = realizeRoot(genome, id, category, meaning, attempt++);
    } while (spellings.has(form));
    entries.set(key, form);
    spellings.add(form);
    return form;
  };
}

export function pronunciationOf(form: string) {
  return form.replace(/sh/gu, "ʃ");
}
