import clsx from "clsx";
import { motion } from "framer-motion";
import { useState } from "react";
import type { Clue, Scene } from "../lib/api/world";
import type { Character } from "../lib/character";
import CharacterSprite from "./character-sprite";

type Props = {
  scene: Scene;
  character: Character;
  observed: string[];
  busy: boolean;
  playingClue: string | null;
  reducedMotion: boolean | null;
  onListen: (clue: Clue) => void;
};

export default function FieldWalk({ scene, character, observed, busy, playingClue, reducedMotion, onListen }: Props) {
  const speakers = [...new Set(scene.clues.map(({ speaker }) => speaker))];
  const [stop, setStop] = useState(-1);
  const [arrived, setArrived] = useState(-1);
  const [dialogue, setDialogue] = useState<Clue | null>(null);
  const speaker = speakers[arrived];
  const lines = scene.clues.filter((clue) => clue.speaker === speaker);

  function walk(next: number) {
    if (busy || next === stop || next < 0 || next >= speakers.length) return;
    setDialogue(null);
    setStop(next);
    if (reducedMotion) setArrived(next);
  }

  return (
    <div className="field-walk" onKeyDown={(event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      walk(stop + (event.key === "ArrowLeft" ? -1 : 1));
    }}>
      <div className={clsx("walk-stage", scene.id === "market" && "market-stage")}>
        {speakers.map((name, index) => (
          <button type="button" key={name} className="walk-npc" style={{ left: `${23 + index * 25}%` }}
            aria-label={`Walk to ${name}`} aria-pressed={stop === index} disabled={busy} onClick={() => walk(index)}>
            <span className="walk-name">{name}</span>
            <span className={clsx("walk-sprite", `npc-${index}`)} aria-hidden="true" />
          </button>
        ))}
        <motion.span aria-hidden="true" className={clsx("walk-player", stop !== arrived && "is-walking")}
          initial={false} animate={{ left: `${stop < 0 ? 8 : 16 + stop * 25}%` }}
          transition={{ duration: reducedMotion ? 0 : .45, ease: "easeInOut" }}
          onAnimationComplete={() => setArrived(stop)}>
          <span className="player-portrait"><CharacterSprite character={character} /></span>
        </motion.span>
      </div>
      {stop < 0 && <p className="field-label mt-3">Tap a character or use the arrow keys while a character is focused.</p>}
      {stop !== arrived && <p className="field-label mt-3" role="status">Walking to {speakers[stop]}…</p>}
      {stop >= 0 && stop === arrived && (
        <motion.div key={speaker} className="walk-dialogue" initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}>
          <h2>{speaker}</h2>
          {dialogue ? (
            <div className="speech-bubble" aria-live="polite">
              <p>{dialogue.context}</p>
              <p className="spoken-phrase">{dialogue.phrase}</p>
              {dialogue.pronunciation && <p className="field-label">/{dialogue.pronunciation}/</p>}
            </div>
          ) : <p className="field-label">Choose what to ask about.</p>}
          <div className="answer-grid mt-3">
            {lines.map((clue, index) => (
              <button key={clue.id} type="button" className="game-button" disabled={busy}
                onClick={() => { setDialogue(clue); onListen(clue); }}>
                {playingClue === clue.id ? "Playing…" : observed.includes(clue.id) ? "Replay" : "Observe"} {index + 1}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
