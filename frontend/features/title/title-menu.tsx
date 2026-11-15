import clsx from "clsx";
import { motion } from "framer-motion";
import CharacterSprite from "../../components/character-sprite";
import PixelIcon from "../../components/pixel-icon";
import type { Progress } from "../../lib/api/saves";

export default function TitleMenu({ progress, slotLoading, reducedMotion, openMap, openSlots }: {
  progress: Progress; slotLoading: boolean; reducedMotion: boolean | null; openMap: () => void; openSlots: () => void;
}) {
  return (
    <>
      <div className={clsx("title-art", progress.character && "has-player")}>
        <div aria-hidden="true" className="starfield" />
        <div aria-hidden="true" className="orbit-trail" />
        <div aria-hidden="true" className="comet" />
        {progress.character ? (
          <motion.figure className="title-player" initial={reducedMotion ? false : { opacity: 0, scale: .93 }}
            animate={{ opacity: 1, scale: 1 }}>
            <div className="title-player-sprite"><CharacterSprite character={progress.character} /></div>
            <figcaption>
              <strong>{progress.character.name}</strong>
              <span><PixelIcon name="badge" /> {progress.badges.length} {progress.badges.length === 1 ? "badge" : "badges"}</span>
            </figcaption>
          </motion.figure>
        ) : <div className="ship" aria-hidden="true" />}
      </div>
      <div className="title-content">
        <motion.h1 id="game-title" tabIndex={-1} className="pixel-title"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
          <span className="title-voices">Voices</span>{" "}
          <span className="title-beyond">beyond</span>{" "}
          <span className="title-stars">Stars</span>
        </motion.h1>
        <motion.p className="title-description"
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : .12, duration: .3 }}>
          Visit distant worlds and learn their languages, one clue at a time.
        </motion.p>
        <motion.button className="game-button primary launch-button"
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reducedMotion ? 0 : .17, duration: .25 }}
          whileTap={reducedMotion ? undefined : { scale: .96, transition: { duration: .08 } }}
          disabled={slotLoading}
          onClick={progress.character ? openMap : openSlots}>
          <PixelIcon name="launch" />
          {progress.character ? "Continue expedition" : "Begin expedition"}
        </motion.button>
        {progress.character && <button className="game-button title-files" onClick={openSlots}>
          <PixelIcon name="save" /> Save files
        </button>}
        <details className="title-help">
          <summary><PixelIcon name="hint" /> How to play</summary>
          <p>Pick a world, listen to its locals, and collect phrases in your journal. Use those clues to pass a test and unlock more worlds.</p>
        </details>
      </div>
    </>
  );
}
