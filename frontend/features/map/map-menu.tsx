import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import PixelIcon from "../../components/pixel-icon";
import type { Progress } from "../../lib/api/saves";
import type { Scene } from "../../lib/api/world";
import StarChart from "./star-chart";

export default function MapMenu({
  world, phase, progress, reducedMotion, travel, retry,
}: {
  world: Scene[]; phase: "loading" | "ready" | "error"; progress: Progress; reducedMotion: boolean | null;
  travel: (planet: string) => void; retry: () => void;
}) {
  const [destination, setDestination] = useState(progress.planet);
  const target = world.find(({ id }) => id === destination) ?? world[0];
  const targetLocked = target ? target.requiredBadges > progress.badges.length : true;

  return (
    <>
      <div className="map-heading">
        <h1 tabIndex={-1} className="screen-heading">Star map</h1>
        <span className="field-label">{progress.badges.length} / {world.length} badges</span>
      </div>
      {phase === "loading" && <p role="status">Scanning for destinations…</p>}
      {phase === "error" && (
        <div>
          <p role="status">The star map couldn't reach the game server.</p>
          <button className="game-button mt-3" onClick={retry}><PixelIcon name="retry" /> Retry scan</button>
        </div>
      )}
      {target && phase === "ready" && (
        <div className="map-console">
          <aside className="destination-preview" aria-label="Selected destination">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={target.id} initial={reducedMotion ? false : { opacity: 0, scale: .94 }}
                animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .2 }}>
                <span className="destination-sprite" data-world={target.id} style={target.id === "echo-basin" ? undefined : { backgroundImage: `url(/worlds/${encodeURIComponent(target.id)}.png)` }} aria-hidden="true" />
                <h2>{target.title}</h2>
                <p>{targetLocked ? `Requires ${target.requiredBadges} badges` :
                  target.mission ? `${target.language} · Difficulty ${target.mission.difficulty}/27` : target.language}</p>
                <button className="game-button primary" disabled={targetLocked} onClick={() => travel(target.id)}><PixelIcon name={targetLocked ? "lock" : "land"} /> {targetLocked ? "Locked" : "Land here"}</button>
              </motion.div>
            </AnimatePresence>
          </aside>
          <StarChart worlds={world} current={progress.planet} selected={target.id}
            badges={progress.badges} reducedMotion={reducedMotion} onSelect={setDestination} />
        </div>
      )}
    </>
  );
}
