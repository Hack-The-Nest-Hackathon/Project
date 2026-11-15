import { motion } from "framer-motion";
import CharacterSprite from "../../components/character-sprite";
import PixelIcon from "../../components/pixel-icon";
import type { Character } from "../../lib/character";

export default function RocketDeparture({ character, planet, reducedMotion, onFinish }: {
  character: Character; planet: string; reducedMotion: boolean | null; onFinish: () => void;
}) {
  return (
    <section className="departure-cutscene" aria-label="Rocket departure">
      <div className="departure-horizon" aria-hidden="true" />
      <div className="departure-pad" aria-hidden="true" />
      <motion.div className="departure-explorer" aria-hidden="true"
        initial={{ x: "-110%", opacity: 1 }}
        animate={reducedMotion ? { x: 0, opacity: 0 } : { x: ["-110%", "-10%", "5%"], opacity: [1, 1, 0], y: [0, -4, -14] }}
        transition={{ duration: reducedMotion ? 0 : 1.45, times: [0, .72, 1] }}>
        <CharacterSprite character={character} />
      </motion.div>
      <motion.div className="departure-rocket" aria-hidden="true"
        initial={{ y: 0 }} animate={reducedMotion ? { y: 0 } : { y: ["0dvh", "0dvh", "-105dvh"] }}
        transition={{ duration: reducedMotion ? 0 : 3.4, times: [0, .57, 1], ease: "easeIn" }}
        onAnimationComplete={reducedMotion ? undefined : onFinish}>
        <motion.span className="departure-flame" initial={{ opacity: 0, scaleY: .25 }}
          animate={reducedMotion ? {} : { opacity: [0, 1, 1], scaleY: [.25, .9, 1.4] }}
          transition={{ delay: 1.35, duration: 1.35, times: [0, .25, 1] }} />
      </motion.div>
      <div className="departure-caption" role="status">
        <p className="field-label">Translation verified</p>
        <h2>Departing {planet}</h2>
      </div>
      <button className="game-button departure-skip" autoFocus onClick={onFinish}>
        <PixelIcon name="map" /> {reducedMotion ? "Return to star map" : "Skip to star map"}
      </button>
    </section>
  );
}
