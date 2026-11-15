import { useRef, useState, type PointerEvent } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { sentenceTokens } from "./sentence-words";

type Drag = { id: number; pointer: number; x: number; y: number; startX: number; startY: number };

function place(chosen: number[], id: number, before?: number) {
  if (before === id) return chosen;
  const next = chosen.filter((word) => word !== id);
  const insertion = before === undefined ? -1 : next.indexOf(before);
  next.splice(insertion < 0 ? next.length : insertion, 0, id);
  return next;
}

export default function DialogueTiles({ phrase, glosses, chosen, onChange, disabled, reducedMotion }: {
  phrase: string; glosses?: (string | undefined)[]; chosen: number[];
  onChange: (next: number[]) => void; disabled: boolean; reducedMotion: boolean | null;
}) {
  const board = useRef<HTMLDivElement>(null);
  const pointer = useRef<Drag | null>(null);
  const moved = useRef(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const tokens = sentenceTokens(phrase);
  const bank = tokens.map(({ word }, index) => ({ word, index })).sort((a, b) =>
    a.word.localeCompare(b.word) || a.index - b.index).map(({ index }) => index);
  if (bank.every((id, index) => id === index)) bank.reverse();

  function release(event: PointerEvent<HTMLButtonElement>) {
    const active = pointer.current;
    pointer.current = null;
    setDrag(null);
    if (!active || disabled || active.pointer !== event.pointerId
      || Math.hypot(event.clientX - active.startX, event.clientY - active.startY) < 6) return;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const zone = element?.closest<HTMLElement>("[data-word-zone]");
    if (!zone || !board.current?.contains(zone)) return;
    if (zone.dataset.wordZone === "bank") {
      onChange(chosen.filter((id) => id !== active.id));
      return;
    }
    const target = element?.closest<HTMLElement>("[data-placed-word]");
    if (!target) { onChange(place(chosen, active.id)); return; }
    const id = Number(target.dataset.placedWord);
    if (id === active.id) return;
    const bounds = target.getBoundingClientRect();
    const before = event.clientX < bounds.left + bounds.width / 2 ? id : chosen[chosen.indexOf(id) + 1];
    onChange(place(chosen, active.id, before));
  }

  function tile(id: number, placed: boolean) {
    const gloss = glosses?.[id];
    return (
      <motion.button key={id} layout={reducedMotion ? false : "position"} type="button" disabled={disabled}
        className={clsx("game-button dialogue-word", drag?.id === id && "is-dragging")}
        data-placed-word={placed ? id : undefined}
        aria-label={`${tokens[id].text}${gloss ? `, ${gloss}` : ""}, ${placed ? "in reply, tap to remove" : "word bank, tap to add"}`}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          moved.current = false;
          const { pointerId, clientX, clientY } = event;
          pointer.current = { id, pointer: pointerId, x: clientX, y: clientY, startX: clientX, startY: clientY };
          event.currentTarget.setPointerCapture(pointerId);
        }}
        onPointerMove={(event) => {
          const active = pointer.current;
          if (!active || event.pointerId !== active.pointer) return;
          if (Math.hypot(event.clientX - active.startX, event.clientY - active.startY) >= 6) {
            moved.current = true;
            setDrag({ ...active, x: event.clientX, y: event.clientY });
          }
        }}
        onPointerUp={release}
        onLostPointerCapture={() => { pointer.current = null; setDrag(null); }}
        onClick={(event) => {
          if (event.detail !== 0 && moved.current) return;
          onChange(placed ? chosen.filter((word) => word !== id) : place(chosen, id));
        }}
        onKeyDown={(event) => {
          if (!placed || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
          event.preventDefault();
          const position = chosen.indexOf(id);
          const offset = event.key === "ArrowLeft" ? -1 : 1;
          if (!chosen[position + offset] && chosen[position + offset] !== 0) return;
          onChange(place(chosen, id, chosen[position + (offset < 0 ? -1 : 2)]));
        }}>
        <span className="dialogue-word-text">{tokens[id].text}</span>
        {gloss && <span className="dialogue-word-gloss" lang="en">{gloss}</span>}
      </motion.button>
    );
  }

  return (
    <div className="dialogue-tiles" ref={board} role="group" aria-label="Build the sentence">
      <p className="field-label">Drag or tap the words to put your reply in order.</p>
      <div className="dialogue-word-zone is-answer" data-word-zone="answer" role="group" aria-label="Your sentence">
        {chosen.length ? chosen.map((id) => tile(id, true)) : <span>Drop words here</span>}
      </div>
      <div className="dialogue-word-zone" data-word-zone="bank" role="group" aria-label="Word bank">
        {bank.filter((id) => !chosen.includes(id)).map((id) => tile(id, false))}
      </div>
      {drag && <span className="game-button dialogue-word-ghost" aria-hidden="true" style={{ left: drag.x, top: drag.y }}>{tokens[drag.id].text}</span>}
    </div>
  );
}
