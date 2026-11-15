import { motion } from "framer-motion";
import { useState } from "react";
import PixelIcon from "../../components/pixel-icon";
import { landingSpot } from "./field-layout";

const touchdown = 2.25;
const dust = Array.from({ length: 18 }, (_, index) => ({
  x: (index % 2 ? -1 : 1) * (22 + index * 5),
  y: -12 + (index * 13) % 42,
  size: 3 + (index * 7) % 9,
}));

export default function RocketLanding({ planet, reducedMotion, onFinish }: {
  planet: string; reducedMotion: boolean | null; onFinish: () => void;
}) {
  const [landed, setLanded] = useState(false);
  const onGround = reducedMotion || landed;

  return (
    <section className="landing-cutscene" aria-label={`Rocket landing on ${planet}`}>
      <motion.div className="landing-vignette" aria-hidden="true" initial={{ opacity: 1 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: [1, 1, 0] }}
        transition={{ duration: reducedMotion ? 0 : 3.75, times: [0, .84, 1] }}
        onAnimationComplete={reducedMotion ? undefined : onFinish} />
      <div className="landing-spot" aria-hidden="true" style={{ left: `${landingSpot.x}%`, top: `${landingSpot.y}%` }}>
        {!reducedMotion && <>
          <motion.span className="landing-shadow" initial={{ scale: .3, opacity: .1 }}
            animate={{ scale: 1, opacity: .8 }} transition={{ duration: touchdown }} />
          <motion.span className="landing-shockwave" initial={{ opacity: 0, scale: .35 }}
            animate={{ opacity: [0, .8, 0], scale: [.35, .55, 2.4] }}
            transition={{ delay: touchdown - .06, duration: .72, times: [0, .12, 1] }} />
          {dust.map(({ x, y, size }, index) => (
            <motion.span key={index} className="landing-dust" style={{ width: size, height: size }}
              initial={{ opacity: 0 }}
              animate={{ x: [0, x * .58, x], y: [0, y - 15, y], scale: [.4, 1, 1.8], opacity: [0, .85, 0] }}
              transition={{ delay: touchdown - .28 + (index % 5) * .06, duration: .9, times: [0, .35, 1] }} />
          ))}
        </>}
        <motion.span className="landing-vehicle"
          initial={reducedMotion ? false : { x: "90vw", y: "-77dvh", rotate: -22 }}
          animate={reducedMotion ? { x: 0, y: 0, rotate: 0 } : {
            x: ["90vw", "16vw", "0vw", "0vw", "0vw"],
            y: ["-77dvh", "-29dvh", "-8dvh", "0dvh", "0dvh"],
            rotate: [-22, -12, 0, 0, 0],
          }}
          transition={{ duration: reducedMotion ? 0 : touchdown, times: [0, .4, .7, .995, 1], ease: [.24, .63, .32, 1] }}
          onAnimationComplete={() => setLanded(true)}>
          <span className="survey-ship-sprite" />
          {!reducedMotion && <motion.span className="landing-plume" initial={{ opacity: 1, scaleY: .55 }}
            animate={{ opacity: [1, 1, 1, 0], scaleY: [.55, 1.2, .85, .16] }}
            transition={{ duration: touchdown + .15, times: [0, .45, .88, 1] }} />}
        </motion.span>
      </div>
      <div className="landing-caption" role="status">
        <p className="field-label">{onGround ? "Touchdown confirmed" : "Survey ship on final approach"}</p>
        <h2>{planet}</h2>
      </div>
      <button type="button" className="game-button landing-skip" autoFocus onClick={onFinish}>
        <PixelIcon name="right" /> {onGround ? "Explore" : "Skip landing"}
      </button>
    </section>
  );
}
