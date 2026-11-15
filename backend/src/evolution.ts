// Each meaning keeps its position in the lexicon as its descendants change.
type Sound = string;
type Lexicon = Sound[][];
type SoundLaw = { from: Sound; to: Sound; position: "any" | "initial" | "final" };
type Language = {
  lexicon: Lexicon;
  family: number;
  plural: string;
  prefixPlural: boolean;
};

const protoFamilies: Lexicon[] = [
  [["m","a","r"], ["t","e","l"], ["v","ai","n"], ["k","o","r"], ["sh","i","m"], ["n","u","l"]],
  [["k","e","t"], ["sh","a","n"], ["r","eu","m"], ["p","i","l"], ["d","o","sh"], ["m","oo","r"]],
  [["z","oo","m"], ["t","ai","r"], ["n","a","sh"], ["k","e","n"], ["sh","o","l"], ["p","u","m"]],
];

const laws: SoundLaw[] = [
  { from: "t", to: "ch", position: "initial" },
  { from: "k", to: "sh", position: "initial" },
  { from: "sh", to: "s", position: "initial" },
  { from: "p", to: "f", position: "initial" },
  { from: "m", to: "v", position: "initial" },
  { from: "a", to: "ai", position: "any" },
  { from: "e", to: "i", position: "any" },
  { from: "i", to: "eu", position: "any" },
  { from: "o", to: "a", position: "any" },
  { from: "oo", to: "u", position: "any" },
  { from: "u", to: "o", position: "any" },
  { from: "r", to: "l", position: "final" },
  { from: "l", to: "r", position: "final" },
  { from: "n", to: "ng", position: "final" },
  { from: "t", to: "s", position: "final" },
  { from: "sh", to: "zh", position: "final" },
];

function applyLaw(lexicon: Lexicon, law: SoundLaw): Lexicon {
  return lexicon.map((word) => word.map((sound, index) => {
    const matchesPosition = law.position === "any"
      || (law.position === "initial" && index === 0)
      || (law.position === "final" && index === word.length - 1);
    return sound === law.from && matchesPosition ? law.to : sound;
  }));
}

export function evolveLanguages(count = 25) {
  let seed = 17041;
  function random(limit: number) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor(seed / 4294967296 * limit);
  }
  const branches: Language[][] = protoFamilies.map((lexicon, family) => [{
    lexicon, family, plural: ["ri", "na", "se"][family], prefixPlural: family === 1,
  }]);
  const signatures = new Set<string>();
  const placeNames = new Set<string>();
  return Array.from({ length: count }, (_, index) => {
    const family = index % branches.length;
    const branch = branches[family];
    for (let attempt = 0; attempt < 256; attempt++) {
      const parent = branch[random(branch.length)];
      let lexicon = applyLaw(parent.lexicon, laws[random(laws.length)]);
      lexicon = applyLaw(lexicon, laws[random(laws.length)]);
      if (random(3) === 0) {
        // Borrow one word for the same meaning from a neighboring family.
        const neighbor = branches[(family + 1) % branches.length];
        const donor = neighbor[random(neighbor.length)];
        const meaning = random(lexicon.length);
        lexicon = lexicon.map((word, slot) => slot === meaning ? donor.lexicon[slot] : word);
      }
      const roots = lexicon.map((word) => word.join(""));
      const signature = roots.join("|");
      const placeName = roots[2] + roots[0];
      if (new Set(roots).size !== roots.length || signatures.has(signature) || placeNames.has(placeName)) continue;
      signatures.add(signature);
      placeNames.add(placeName);
      const plural = random(3) === 0 ? ["ri", "na", "se", "lo", "ki"][random(5)] : parent.plural;
      const prefixPlural = random(5) === 0 ? !parent.prefixPlural : parent.prefixPlural;
      branch.push({ lexicon, family, plural, prefixPlural });
      const pluralize = (word: string) => prefixPlural ? `${plural}-${word}` : `${word}-${plural}`;
      return { roots, family, placeName, pluralize };
    }
    throw new Error("Unable to generate a distinct descendant language");
  });
}
