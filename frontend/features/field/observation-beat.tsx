import { motion } from "framer-motion";
import PixelIcon from "../../components/pixel-icon";
import type { Clue } from "../../lib/api/world";
import SentenceWords from "./sentence-words";

export default function ObservationBeat({ clue, reducedMotion, newWords, language, replay }: {
  clue: Clue;
  reducedMotion: boolean | null;
  newWords?: ReadonlySet<string>;
  language?: string;
  replay: () => void;
}) {
  const observation = clue.observation;
  return (
    <>
      <motion.div className="story-beat observation-story"
        initial={reducedMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : .2 }}>
        <div><span>What happens</span><p>{clue.context}</p></div>
        {observation && (
          <div className={`observation-props prop-${observation.prop}`} aria-hidden="true">
            {observation.action === "see" && <PixelIcon name="eye" />}
            {Array.from({ length: observation.count }, (_, index) => (
              <motion.div key={index} className="observation-prop"
                initial={reducedMotion ? false : { opacity: 0, y: 9, scale: .7 }}
                animate={{ opacity: 1, y: observation.action === "load" ? [0, -8, 2] : 0,
                  x: observation.action === "carry" ? [-9, 0] : 0, scale: 1 }}
                transition={{ duration: reducedMotion ? 0 : .36, delay: reducedMotion ? 0 : index * .09 }}>
                <PixelIcon name={observation.prop} />
              </motion.div>
            ))}
            {observation.action === "load" && <PixelIcon name="crate" />}
          </div>
        )}
      </motion.div>
      <motion.div className="speech-bubble"
        initial={reducedMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : .2, delay: reducedMotion ? 0 : .18 }}>
        <p className="field-label">What you hear</p>
        <SentenceWords phrase={clue.phrase} glosses={clue.glosses} newWords={newWords}
          language={language} onPick={replay} />
      </motion.div>
    </>
  );
}
