import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CharacterSprite from "./character-sprite";
import { characterOptions, type Appearance, type Character } from "../lib/character";

const names = ["Nova", "Vesper", "Kestrel", "Sable", "Mira", "Orion", "Juniper", "Sol", "Iona", "Tavi", "Rune", "Neri"];
const labels: Record<keyof Appearance, string> = {
  skin: "Skin tone", hair: "Hairstyle", hairColor: "Hair color", suit: "Flight suit", accessory: "Accessory",
};
const traits = Object.keys(characterOptions) as (keyof Appearance)[];

export default function CharacterEditor({ character, isNew, reducedMotion, onSave }: {
  character: Character; isNew: boolean; reducedMotion: boolean | null; onSave: (next: Character) => void;
}) {
  const [draft, setDraft] = useState(() => isNew ? { ...character, name: "" } : character);
  const [step, setStep] = useState<"name" | "look">(isNew ? "name" : "look");
  const name = draft.name.trim();
  const spriteKey = traits.map((trait) => draft[trait]).join("-");
  const transition = { duration: reducedMotion ? 0 : .22 };

  function suggestName() {
    const suggestions = names.filter((suggestion) => suggestion !== name);
    const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    setDraft((current) => ({ ...current, name: suggestion }));
  }

  function randomize() {
    const randomIndex = (length: number) => Math.floor(Math.random() * length);
    const next = { ...draft };
    for (const trait of traits) next[trait] = randomIndex(characterOptions[trait].length);
    setDraft(next);
  }

  return (
    <form className="character-console" onSubmit={(event) => {
      event.preventDefault();
      if (!name) return;
      if (step === "name") setStep("look");
      else onSave({ ...draft, name });
    }}>
      <motion.div className="character-preview" initial={reducedMotion ? false : { opacity: 0, scale: .96 }}
        animate={{ opacity: 1, scale: 1 }} transition={transition}>
        <span className="profile-orbit" aria-hidden="true" />
        <span className="profile-scan" aria-hidden="true" />
        <motion.div className="character-hologram"
          animate={reducedMotion ? { y: 0 } : { y: [0, -5, 0] }}
          transition={{ duration: 2.4, repeat: reducedMotion ? 0 : Infinity }}>
          <motion.div key={spriteKey} initial={reducedMotion ? false : { opacity: .55, scale: .93 }}
            animate={{ opacity: 1, scale: 1 }} transition={transition}>
            <CharacterSprite character={draft} />
          </motion.div>
        </motion.div>
        <p>{name || "Unnamed explorer"}</p>
      </motion.div>
      <div>
        <div className="profile-steps" aria-label="Profile setup">
          <button type="button" className="game-button" aria-pressed={step === "name"} onClick={() => setStep("name")}>Name</button>
          <button type="button" className="game-button" aria-pressed={step === "look"} disabled={!name} onClick={() => setStep("look")}>Appearance</button>
        </div>
        <AnimatePresence initial={false} mode="wait">
          <motion.div key={step} className="character-form" initial={reducedMotion ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reducedMotion ? 0 : -8 }} transition={transition}>
            {step === "name" ? (
              <>
                <label>Explorer name
                  <input value={draft.name} maxLength={24} required autoComplete="off" placeholder="Choose a name"
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                </label>
                <div className="answer-grid">
                  <button type="button" className="game-button" onClick={suggestName}>Suggest a name</button>
                  <button type="submit" className="game-button primary" disabled={!name}>Choose appearance →</button>
                </div>
              </>
            ) : (
              <>
                <div className="character-traits">
                  {traits.map((trait) => (
                    <label key={trait}>{labels[trait]}
                      <select value={draft[trait]} onChange={(event) => setDraft({ ...draft, [trait]: Number(event.target.value) })}>
                        {characterOptions[trait].map((option, index) => <option key={option} value={index}>{option}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="answer-grid">
                  <button type="button" className="game-button" onClick={randomize}>Randomize look</button>
                  <motion.button type="submit" className="game-button primary" disabled={!name}
                    whileTap={reducedMotion ? undefined : { scale: .96 }}>
                    {isNew ? "Create profile & launch" : "Save profile"}
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </form>
  );
}
