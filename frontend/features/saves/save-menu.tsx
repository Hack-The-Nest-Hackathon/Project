import clsx from "clsx";
import { motion } from "framer-motion";
import CharacterSprite from "../../components/character-sprite";
import PixelIcon from "../../components/pixel-icon";
import type { Progress } from "../../lib/api/saves";

export default function SaveMenu({
  progress, savedSlots, slot, slotLoading, saveStatus, reducedMotion, selectSlot, openMap, openProfile, openTitle,
}: {
  progress: Progress; savedSlots: Partial<Record<number, Progress>>; slot: number;
  slotLoading: boolean; saveStatus: string; reducedMotion: boolean | null;
  selectSlot: (slot: number) => void; openMap: () => void; openProfile: () => void; openTitle: () => void;
}) {
  return (
    <>
      <button className="game-button" onClick={openTitle}><PixelIcon name="back" /> Title</button>
      <h1 tabIndex={-1} className="screen-heading">Save files</h1>
      <div className="save-rack">
        {[1, 2, 3].map((number) => (
          <motion.button key={number} className={clsx("slot-card", slot === number && "is-selected")}
            aria-pressed={slot === number} onClick={() => selectSlot(number)}
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : number * .055 }}
            whileTap={reducedMotion ? undefined : { scale: .97 }}>
            {savedSlots[number]?.character
              ? <span className="slot-portrait"><CharacterSprite character={savedSlots[number].character} /></span>
              : <span className="cartridge-sprite" aria-hidden="true" />}
            <strong>0{number}</strong>
            <span>{savedSlots[number]?.character?.name ?? (slot === number && slotLoading ? "Reading save…" : "New explorer")}</span>
            {slot === number && !slotLoading && <span className="field-label">{progress.badges.length} badges</span>}
          </motion.button>
        ))}
      </div>
      <p className="field-label mt-4 min-h-5" role="status">{saveStatus}</p>
      <div className="answer-grid mt-3">
        {progress.character && <button className="game-button" disabled={slotLoading}
          onClick={openProfile}><PixelIcon name="edit" /> Edit profile</button>}
        <motion.button className="game-button primary" disabled={slotLoading} onClick={openMap}
          whileTap={reducedMotion ? undefined : { scale: .96 }}>
          <PixelIcon name={progress.character ? "map" : "profile"} /> {progress.character ? "Open star map" : "Create profile"}
        </motion.button>
      </div>
    </>
  );
}
