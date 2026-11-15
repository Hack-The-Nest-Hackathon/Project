import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import CharacterSprite from "../../components/character-sprite";
import PixelIcon from "../../components/pixel-icon";
import type { Character } from "../../lib/character";
import type { Clue } from "../../lib/api/world";
import SentenceWords, { sentenceTokens } from "./sentence-words";

export default function ObservationBeat({ clue, reducedMotion, newWords, language, character, speaking, speakerIndex, busy, speak, replay, endLocalTurn }: {
  clue: Clue;
  reducedMotion: boolean | null;
  newWords?: ReadonlySet<string>;
  language?: string;
  character: Character;
  speaking: boolean;
  speakerIndex: number;
  busy: boolean;
  speak: (report: (status: string, understood?: boolean) => void) => Promise<void>;
  replay: () => void;
  endLocalTurn: () => void;
}) {
  const observation = clue.observation;
  const [turn, setTurn] = useState<"local" | "reply" | "sent">("local");
  const [chosen, setChosen] = useState<number[]>([]);
  const [retry, setRetry] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const tokens = sentenceTokens(clue.phrase);
  const tiles = tokens.map(({ word }, index) => ({ word, index })).sort((a, b) =>
    a.word.localeCompare(b.word) || a.index - b.index);
  if (tiles.every(({ index }, position) => index === position)) tiles.reverse();

  function checkReply() {
    if (chosen.every((index, position) => tokens[index].word === tokens[position].word)) {
      setTurn("sent");
    } else {
      setRetry(true);
    }
  }

  const transition = { duration: reducedMotion ? 0 : .18 };
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
      <AnimatePresence mode="wait">
        <motion.div key={turn === "local" ? "local" : "reply"}
          className={clsx("speech-bubble dialogue-turn", turn !== "local" && "player-turn")}
          initial={reducedMotion ? false : { opacity: 0, x: turn === "local" ? -10 : 10 }}
          animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={transition}>
          {turn === "local" ? (
            <>
              <div className="dialogue-turn-heading">
                <span className={clsx("walk-sprite", `npc-${speakerIndex}`, speaking && "is-speaking")} aria-hidden="true" />
                <p className="field-label">{clue.speaker} {speaking ? "· Speaking" : "· Full sentence"}</p>
              </div>
              <SentenceWords phrase={clue.phrase} glosses={clue.glosses} newWords={newWords}
                roles={clue.roles} language={language} onPick={replay} />
              {clue.translation && <p className="dialogue-translation"><span>Full meaning</span> {clue.translation}</p>}
              <button type="button" className="game-button" disabled={busy} onClick={() => {
                endLocalTurn();
                setChosen([]);
                setRetry(false);
                setTurn("reply");
              }}>
                <PixelIcon name="chat" /> Your turn
              </button>
            </>
          ) : (
            <>
              <div className="dialogue-turn-heading">
                <motion.span className={clsx("reply-portrait", busy && "is-speaking")} initial={false} aria-hidden="true"
                  animate={turn === "sent" && !reducedMotion ? { y: [0, -4, 0, -2, 0] } : { y: 0 }}>
                  <CharacterSprite character={character} />
                </motion.span>
                <p className="field-label">{turn === "sent" ? "You · Reply understood" : "You · Build your reply"}</p>
              </div>
              {turn === "sent" ? (
                <motion.div role="status" initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }} transition={transition}>
                  <p className="spoken-phrase" lang={language}>{clue.phrase}</p>
                  <p className="dialogue-translation">{clue.translation}</p>
                </motion.div>
              ) : (
                <>
                  <p className="dialogue-translation">Say it back in the local language. {clue.translation && <strong>{clue.translation}</strong>}</p>
                  <p className="reply-draft" aria-live="polite" lang={language}>
                    {chosen.length ? chosen.map((index) => tokens[index].word).join(" ") : "Tap the words in order."}
                  </p>
                  <div className="reply-tiles" role="group" aria-label="Reply words">
                    {tiles.map(({ word, index }) => (
                      <button key={index} type="button" className="game-button" lang={language}
                        disabled={busy || chosen.includes(index)} onClick={() => { setChosen([...chosen, index]); setRetry(false); }}>
                        {word}
                      </button>
                    ))}
                  </div>
                  {retry && <p role="status" className="reply-feedback">Try a different word order. You can look at the local’s line again.</p>}
                  <div className="reply-actions">
                    <button type="button" className="game-button" disabled={busy || !chosen.length}
                      onClick={() => { setChosen(chosen.slice(0, -1)); setRetry(false); }}>Undo word</button>
                    <button type="button" className="game-button primary" disabled={busy || chosen.length !== tokens.length}
                      onClick={checkReply}>Send reply</button>
                    <button type="button" className="game-button" disabled={busy} onClick={() => {
                      void speak((status, understood) => {
                        setVoiceStatus(status);
                        if (understood) setTurn("sent");
                      });
                    }}><PixelIcon name="mic" /> Speak reply</button>
                  </div>
                  {voiceStatus && <p className="reply-feedback" role="status">{voiceStatus}</p>}
                </>
              )}
              <button type="button" className="game-button" disabled={busy} onClick={() => { setVoiceStatus(""); setTurn("local"); }}>
                <PixelIcon name="back" /> Local’s line
              </button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
