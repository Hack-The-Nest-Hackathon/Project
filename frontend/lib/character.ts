export const characterOptions = {
  skin: ["Porcelain", "Peach", "Honey", "Bronze", "Umber", "Deep umber"],
  hair: ["Sweep", "Bob", "Spikes", "Braids", "High puff", "Shaved"],
  hairColor: ["Ink", "Chestnut", "Copper", "Gold", "Lilac", "Seafoam"],
  suit: ["Mint", "Coral", "Indigo", "Ochre", "Rose", "Glacier"],
  accessory: ["None", "Goggles", "Headset", "Star pin", "Scarf", "Visor"],
} as const;

export type Appearance = Record<keyof typeof characterOptions, number>;
export type Character = Appearance & { name: string };

export const defaultCharacter: Character = {
  name: "Cadet", skin: 2, hair: 0, hairColor: 0, suit: 0, accessory: 0,
};

export function isCharacter(value: unknown): value is Character {
  if (!value || typeof value !== "object") return false;
  const character = value as Partial<Character>;
  return typeof character.name === "string" && character.name.trim().length > 0
    && [...character.name].length <= 24
    && (Object.keys(characterOptions) as (keyof Appearance)[]).every((key) => {
      const option = character[key];
      return typeof option === "number" && Number.isInteger(option) && option >= 0 && option < characterOptions[key].length;
    });
}
