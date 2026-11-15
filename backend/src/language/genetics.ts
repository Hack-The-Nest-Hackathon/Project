export const consonants = ["b", "d", "f", "g", "k", "l", "m", "n", "p", "s", "t", "v", "z", "sh"];
export const vowels = ["a", "e", "i", "o", "u"];
const codas = ["", "n", "l", "m", "k", "s"];
export const orders = ["svo", "sov", "vso", "vos", "ovs", "osv"] as const;
type Order = typeof orders[number];

export type Genome = {
  onsets: number;
  vowels: number;
  codas: number;
  order: Order;
  quantity: "before" | "after" | "prefix" | "suffix";
  timeFirst: boolean;
  sourceFirst: boolean;
  rootLength: 2 | 3;
  lexicalSeeds: number[];
};

export function randomSource(key: string) {
  let state = 2166136261;
  for (const character of key) state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  return (limit: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor(state / 4294967296 * limit);
  };
}

function inventory(pool: readonly string[], mask: number) {
  return pool.filter((_, index) => mask & (1 << index));
}

export type Concept = { category: "noun" | "verb" | "particle"; meaning: string };

export function realizeRoot(genome: Genome, id: string, category: Concept["category"], meaning: string, attempt = 0) {
  const key = `${category}:${meaning.trim().toLowerCase()}`;
  const slot = randomSource(key)(genome.lexicalSeeds.length);
  const random = randomSource(`${id}:${genome.lexicalSeeds[slot]}:${key}:${attempt}`);
  const onsets = inventory(consonants, genome.onsets);
  const nuclei = inventory(vowels, genome.vowels);
  const endings = inventory(codas, genome.codas);
  const size = category === "particle" ? 2 : genome.rootLength;
  let root = "";
  for (let i = 0; i < size; i++) root += onsets[random(onsets.length)] + nuclei[random(nuclei.length)];
  return root + endings[random(endings.length)];
}

const populationSize = 26;
export const generationCount = 20;
const particles = ["one", "two", "three", "several", "earlier", "and", "reported", "witnessed"];
const quantityModes = ["before", "after", "prefix", "suffix"] as const;

export function evolveGrammar(id: string, rank: number, family: number, vocabulary: readonly Concept[] = []) {
  const random = randomSource(`language-v4:${id}:${rank}:${family}`);
  const choose = <T>(pool: readonly T[]): T => pool[random(pool.length)];
  const allowedOrders = rank === 1 ? orders.slice(0, 1) : rank <= 5 ? orders.slice(0, 3) : orders;
  const allowedQuantities = rank <= 2 ? quantityModes.slice(0, 1) : rank <= 5 ? quantityModes.slice(0, 2) : quantityModes;
  const preferredOrder = allowedOrders[(rank - 1 + family) % allowedOrders.length];
  const preferredQuantity = allowedQuantities[(rank + family) % allowedQuantities.length];
  const familySounds = consonants.filter((_, index) => (index + family) % 3 !== 0);
  const concepts: Concept[] = [...vocabulary, ...particles.map((meaning) => ({ category: "particle" as const, meaning }))];

  function seedGenome(): Genome {
    return {
      onsets: 1 + random((1 << consonants.length) - 1),
      vowels: 1 + random((1 << vowels.length) - 1),
      codas: 1 | random(1 << codas.length),
      order: choose(allowedOrders),
      quantity: choose(allowedQuantities),
      timeFirst: Boolean(random(2)),
      sourceFirst: Boolean(random(2)),
      rootLength: rank <= 2 ? 2 : choose([2, 3]),
      lexicalSeeds: Array.from({ length: 8 }, () => random(2 ** 31)),
    };
  }

  function score(genome: Genome) {
    const onsets = inventory(consonants, genome.onsets);
    const nuclei = inventory(vowels, genome.vowels);
    const endings = inventory(codas, genome.codas);
    const roots = concepts.map(({ category, meaning }) => realizeRoot(genome, id, category, meaning));
    const sharedStarts = new Set(roots.map((word) => word.slice(0, 2))).size;
    const localSounds = onsets.filter((sound) => familySounds.includes(sound)).length;
    return new Set(roots).size * 20 + sharedStarts * 2
      - Math.abs(onsets.length - 9) * 3 - Math.abs(nuclei.length - 4) * 4
      - Math.abs(endings.length - (rank <= 2 ? 2 : 4)) * 2
      + (localSounds - (onsets.length - localSounds)) * 2
      + (genome.order === preferredOrder ? 8 : 0)
      + (genome.quantity === preferredQuantity ? 7 : 0)
      + (genome.rootLength === (rank > 12 ? 3 : 2) ? 3 : 0);
  }

  function offspring(a: Genome, b: Genome): Genome {
    const child = { ...a };
    const genes = Object.keys(child) as (keyof Genome)[];
    function inherit<K extends keyof Genome>(gene: K) {
      if (random(2)) child[gene] = b[gene];
    }
    genes.forEach(inherit);
    child.lexicalSeeds = a.lexicalSeeds.map((seed, index) => random(2) ? b.lexicalSeeds[index] : seed);
    if (random(3) !== 0) {
      switch (choose(genes)) {
        case "onsets": child.onsets = (child.onsets ^ (1 << random(consonants.length))) || a.onsets; break;
        case "vowels": child.vowels = (child.vowels ^ (1 << random(vowels.length))) || a.vowels; break;
        case "codas": child.codas = 1 | (child.codas ^ (1 << random(codas.length))); break;
        case "order": child.order = choose(allowedOrders); break;
        case "quantity": child.quantity = choose(allowedQuantities); break;
        case "timeFirst": child.timeFirst = !child.timeFirst; break;
        case "sourceFirst": child.sourceFirst = !child.sourceFirst; break;
        case "rootLength": child.rootLength = rank <= 2 ? 2 : child.rootLength === 2 ? 3 : 2; break;
        case "lexicalSeeds": child.lexicalSeeds[random(child.lexicalSeeds.length)] = random(2 ** 31); break;
      }
    }
    return child;
  }

  let population = Array.from({ length: populationSize }, seedGenome);
  const leaderboard = () => population.map((genome) => ({ genome, fitness: score(genome) })).sort((a, b) => b.fitness - a.fitness);
  const initialFitness = leaderboard()[0].fitness;
  for (let generation = 0; generation < generationCount; generation++) {
    const ranked = leaderboard();
    const select = () => ranked[Math.min(random(ranked.length), random(ranked.length), random(ranked.length))].genome;
    population = [
      ranked[0].genome, ranked[1].genome,
      ...Array.from({ length: populationSize - 3 }, () => offspring(select(), select())),
      seedGenome(),
    ];
  }
  const { genome, fitness } = leaderboard()[0];
  return { genome, initialFitness, fitness, generations: generationCount };
}
