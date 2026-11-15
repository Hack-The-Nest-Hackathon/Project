type Genome = {
  onsets: string[];
  vowels: string[];
  codas: string[];
  plural: string;
  prefixPlural: boolean;
};

const frenchSeed: Genome = {
  onsets: ["p", "l", "t", "m", "v", "r"],
  vowels: ["a", "e", "i", "o", "u", "oo"],
  codas: ["m", "n", "r", "l", "s", "t"],
  plural: "ri",
  prefixPlural: false,
};

export function evolveLanguages(seed: Genome = frenchSeed, count = 25) {
  let state = 17041;
  function random(limit: number) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor((state / 4294967296) * limit);
  }
  function cross(left: Genome, right: Genome): Genome {
    const mix = (a: string[], b: string[], pool: string[]) => {
      const genes = a.map((gene, index) => random(2) ? gene : b[index % b.length]);
      genes[random(genes.length)] = pool[random(pool.length)];
      return genes;
    };
    return {
      onsets: mix(left.onsets, right.onsets, ["k", "sh", "z", "f", "d", "b", "s", "ch", "zh"]),
      vowels: mix(left.vowels, right.vowels, ["a", "e", "i", "o", "u", "ai", "oo", "eu"]),
      codas: mix(left.codas, right.codas, ["k", "m", "n", "r", "sh", "s", "t", "ng"]),
      plural: ["ri", "na", "se", "lo", "ki", left.plural, right.plural][random(7)],
      prefixPlural: random(4) ? left.prefixPlural : !left.prefixPlural,
    };
  }

  function express(genome: Genome) {
    const roots = Array.from({ length: 6 }, (_, index) =>
      genome.onsets[index] + genome.vowels[index] + genome.codas[index]);
    const pluralize = (word: string) => genome.prefixPlural
      ? `${genome.plural}-${word}` : `${word}-${genome.plural}`;
    const forms = [...roots, ...roots.map(pluralize)];
    return { genome, roots, pluralize, forms };
  }

  const languages: ReturnType<typeof express>[] = [];
  let parents = [seed];
  for (let generation = 0; generation < count; generation++) {
    const candidates = Array.from({ length: 64 }, () =>
      express(cross(parents[random(parents.length)], parents[random(parents.length)])));
    const viable = candidates.filter(({ forms }) =>
      new Set(forms).size === forms.length && forms.every((form) => /^[a-z-]{3,12}$/.test(form)));
    function score(candidate: ReturnType<typeof express>) {
      const distances = languages.map((previous) =>
        candidate.forms.filter((form) => !previous.forms.includes(form)).length);
      const diversity = new Set(candidate.genome.onsets).size;
      return (distances.length ? Math.min(...distances) : 12) * 10 + diversity;
    }
    const ranked = viable.map((candidate) => ({ candidate, score: score(candidate) }))
      .sort((a, b) => b.score - a.score);
    if (!ranked.length || ranked[0].score < 10) throw new Error("Language evolution ran out of distinct candidates");
    languages.push(ranked[0].candidate);
    parents = ranked.slice(0, 8).map(({ candidate }) => candidate.genome);
  }
  return languages;
}
