import PixelIcon from "../../components/pixel-icon";
import clsx from "clsx";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Clue, Scene } from "../../lib/api/world";
import type { Character } from "../../lib/character";
import CharacterSprite from "../../components/character-sprite";
import ObservationBeat from "./observation-beat";

type Props = {
  scene: Scene;
  character: Character;
  observed: string[];
  busy: boolean;
  paused: boolean;
  playingClue: string | null;
  reducedMotion: boolean | null;
  onListen: (clue: Clue) => void;
  newWordsByClue: ReadonlyMap<string, ReadonlySet<string>>;
};

const directions = {
  left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1],
} as const;
type Direction = keyof typeof directions;
type Position = { x: number; y: number };
const keys: Record<string, Direction> = {
  arrowleft: "left", a: "left", arrowright: "right", d: "right",
  arrowup: "up", w: "up", arrowdown: "down", s: "down",
};
const introductions: Record<string, string> = {
  Merchant: "The merchant shows you the same fruit in two different quantities. Listen for the word that changes.",
  Baker: "The baker compares one loaf with a group of loaves. Listen for the number.",
  Quartermaster: "The quartermaster loads two kinds of cargo. Listen for what changes when she switches items.",
  Lamplighter: "The lamplighter points to the scout’s lanterns. Compare one lantern with several.",
  Scout: "The scout shows you a different object. Check whether the same quantity pattern applies.",
  Gatekeeper: "The gatekeeper describes the scout’s actions. Compare carrying an object with simply seeing it.",
};
const distance = (a: Position, b: Position) => Math.hypot(a.x - b.x, a.y - b.y);
const withinGround = (x: number, y: number): Position => ({
  x: Math.max(6, Math.min(94, x)),
  y: Math.max(43, Math.min(76, y)),
});

function blocked(point: Position, stops: Position[]) {
  return stops.some((stop) => Math.hypot((point.x - stop.x) / 6, (point.y - stop.y) / 6) < 1);
}

function routeAround(start: Position, goal: Position, stops: Position[]): Position[] {
  const clear = (a: Position, b: Position) => {
    const steps = Math.max(1, Math.ceil(distance(a, b)));
    for (let i = 1; i <= steps; i++) {
      if (blocked({ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps }, stops)) return false;
    }
    return true;
  };
  if (clear(start, goal)) return [goal];
  // A small visibility graph around each NPC lets click-to-walk route past them.
  const nodes = [start, goal, ...stops.flatMap(({ x, y }) =>
    [-8, 8].flatMap((dx) => [-8, 8].map((dy) => withinGround(x + dx, y + dy))))];
  const queue: number[][] = [[0]];
  const seen = new Set([0]);
  for (const path of queue) {
    const from = nodes[path[path.length - 1]];
    for (let index = 1; index < nodes.length; index++) {
      if (seen.has(index) || !clear(from, nodes[index])) continue;
      const next = [...path, index];
      if (index === 1) return next.slice(1).map((point) => nodes[point]);
      seen.add(index);
      queue.push(next);
    }
  }
  return [];
}

export default function FieldWalk({ scene, character, observed, busy, paused, playingClue, reducedMotion, onListen, newWordsByClue }: Props) {
  const speakers = [...new Set(scene.clues.map(({ speaker }) => speaker))];
  const stops = speakers.map((name, index) => ({ name, x: 22 + index * 27, y: [51, 64, 48][index % 3] }));
  const [position, setPosition] = useState<Position>({ x: 12, y: 69 });
  const [moving, setMoving] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const [speaker, setSpeaker] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<Clue | null>(null);
  const held = useRef(new Map<string, Direction>());
  const waypoint = useRef<{ name: string; points: Position[] } | null>(null);
  const location = useRef(position);
  const directionFacing = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const nearest = stops.find((stop) => distance(stop, position) < 12);
  const nearby = useRef(nearest);
  nearby.current = nearest;
  const lines = scene.clues.filter((clue) => clue.speaker === speaker);
  const observationIndex = dialogue ? lines.findIndex(({ id }) => id === dialogue.id) : -1;
  const nextObservation = lines[observationIndex + 1];

  function observe(clue: Clue) {
    setDialogue(clue);
    onListen(clue);
  }

  useEffect(() => {
    if (paused || busy) return;
    let frame = 0;
    let last = 0;
    let wasMoving = false;
    let velocityX = 0;
    let velocityY = 0;
    const measure = () => ({
      width: Math.max(1, (stage.current?.clientWidth ?? window.innerWidth) / 100),
      height: Math.max(1, (stage.current?.clientHeight ?? window.innerHeight) / 100),
    });
    let scale = measure();
    const resize = () => { scale = measure(); };
    function tick(now: number) {
      const elapsed = last ? Math.min(now - last, 40) / 1000 : 0;
      last = now;
      const route = waypoint.current;
      const goal = route?.points[0];
      const current = location.current;
      let x = 0;
      let y = 0;
      for (const direction of new Set(held.current.values())) {
        x += directions[direction][0];
        y += directions[direction][1];
      }
      if (goal) {
        x = goal.x - current.x;
        y = goal.y - current.y;
        if (Math.hypot(x, y) < .55) {
          route?.points.shift();
          velocityX = velocityY = 0;
          if (route && !route.points.length) {
            waypoint.current = null;
            setSpeaker(route.name);
          }
          x = y = 0;
        }
      }
      const dx = goal ? x * scale.width : x;
      const dy = goal ? y * scale.height : y;
      const length = Math.hypot(dx, dy);
      const speed = Math.max(110, Math.min(scale.width, scale.height) * 32);
      const smoothing = 1 - Math.exp(-20 * elapsed);
      const movingSpeed = goal && elapsed ? Math.min(speed, length / elapsed) : speed;
      velocityX += ((length ? dx / length * movingSpeed : 0) - velocityX) * smoothing;
      velocityY += ((length ? dy / length * movingSpeed : 0) - velocityY) * smoothing;
      let advanced = false;
      if (elapsed && Math.hypot(velocityX, velocityY) > 4) {
        const desired = withinGround(current.x + velocityX * elapsed / scale.width, current.y + velocityY * elapsed / scale.height);
        const horizontal = { x: desired.x, y: current.y };
        const vertical = { x: current.x, y: desired.y };
        const next = !blocked(desired, stops) ? desired
          : !blocked(horizontal, stops) ? horizontal
          : !blocked(vertical, stops) ? vertical : current;
        if (next.x !== current.x || next.y !== current.y) {
          advanced = true;
          location.current = next;
          setPosition(next);
        }
      }
      if (advanced !== wasMoving) {
        wasMoving = advanced;
        setMoving(advanced);
      }
      if (advanced && Math.abs(velocityX) > 14 && directionFacing.current !== (velocityX < 0)) {
        directionFacing.current = velocityX < 0;
        setFacingLeft(directionFacing.current);
      }
      frame = requestAnimationFrame(tick);
    }
    function press(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey ||
        (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]"))) return;
      const key = event.key.toLowerCase();
      if (key === "e" && nearby.current) {
        if (!event.repeat) { stop(); setSpeaker(nearby.current.name); setDialogue(null); }
      } else if (keys[key]) {
        event.preventDefault();
        if (!held.current.has(key)) move(key, keys[key]);
      }
    }
    const release = (event: KeyboardEvent) => held.current.delete(event.key.toLowerCase());
    function stop() { held.current.clear(); waypoint.current = null; velocityX = velocityY = 0; }
    frame = requestAnimationFrame(tick);
    window.addEventListener("keydown", press);
    window.addEventListener("keyup", release);
    window.addEventListener("blur", stop);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      stop();
      setMoving(false);
      window.removeEventListener("keydown", press);
      window.removeEventListener("keyup", release);
      window.removeEventListener("blur", stop);
      window.removeEventListener("resize", resize);
    };
  }, [paused, busy]);

  function move(key: string, direction: Direction) {
    waypoint.current = null;
    held.current.set(key, direction);
    setSpeaker(null);
    setDialogue(null);
  }

  function step(direction: Direction) {
    const [x, y] = directions[direction];
    const current = location.current;
    const next = withinGround(current.x + x * 1.5, current.y + y * 1.5);
    if (x) {
      directionFacing.current = x < 0;
      setFacingLeft(directionFacing.current);
    }
    if (!blocked(next, stops)) { location.current = next; setPosition(next); }
    setSpeaker(null);
    setDialogue(null);
  }

  function approach(stop: typeof stops[number]) {
    held.current.clear();
    setDialogue(null);
    if (distance(location.current, stop) < 12) {
      waypoint.current = null;
      setSpeaker(stop.name);
    } else {
      setSpeaker(null);
      const points = routeAround(location.current, { x: stop.x, y: stop.y + 9 }, stops);
      waypoint.current = points.length ? { name: stop.name, points } : null;
    }
  }

  return (
    <div className="field-walk">
      <div ref={stage} className={clsx("walk-stage", scene.id === "market" && "market-stage")}>
        <div className="walk-ground" aria-hidden="true" />
        <div className="walk-path" aria-hidden="true" />
        {stops.map((stop, index) => (
          <button type="button" key={stop.name} className="walk-npc" style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
            aria-label={`Approach ${stop.name}`} aria-pressed={speaker === stop.name} disabled={busy}
            onClick={() => approach(stop)}>
            <span className="walk-name">{stop.name}</span>
            <span className={clsx("walk-sprite", `npc-${index}`,
              speaker === stop.name && dialogue && playingClue === dialogue.id && "is-speaking")} aria-hidden="true" />
          </button>
        ))}
        <span aria-hidden="true" className={clsx("walk-player", facingLeft && "faces-left", moving && !reducedMotion && "is-walking")}
          style={{ left: `${position.x}%`, top: `${position.y}%` }}>
          <span className="player-portrait"><CharacterSprite character={character} /></span>
        </span>
      </div>
      {!speaker && <div className="walk-prompt">
        {nearest ? <button className="game-button" disabled={busy} onClick={() => approach(nearest)}>
          <PixelIcon name="chat" /> Talk to {nearest.name}
        </button> : <><p>{scene.description}</p><p className="field-label">Move with WASD, arrow keys, or the on-screen pad. Tap a character or press E when nearby.</p></>}
      </div>}
      <div className="walk-controls" aria-label="Movement controls">
        {(["up", "left", "down", "right"] as const).map((direction) => (
          <button key={direction} type="button" className={`game-button walk-${direction}`}
            aria-label={`Walk ${direction}`} disabled={busy}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              move(`touch-${event.pointerId}`, direction);
              step(direction);
            }}
            onPointerUp={(event) => held.current.delete(`touch-${event.pointerId}`)}
            onLostPointerCapture={(event) => held.current.delete(`touch-${event.pointerId}`)}
            onClick={(event) => {
              if (event.detail !== 0) return;
              waypoint.current = null;
              step(direction);
            }}><PixelIcon name={direction} /></button>
        ))}
      </div>
      {speaker && (
        <motion.div key={speaker} className="walk-dialogue" initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}>
          <div className="observation-heading">
            <h2>{speaker}</h2>
            {dialogue && <p className="field-label">{observationIndex + 1} / {lines.length} · {dialogue.observation?.label}</p>}
          </div>
          {dialogue ? (
            <ObservationBeat key={dialogue.id} clue={dialogue} reducedMotion={reducedMotion}
              newWords={newWordsByClue.get(dialogue.id)} language={scene.id === "market" ? "fr" : undefined}
              replay={() => onListen(dialogue)} />
          ) : <p className="field-label">{introductions[speaker] ?? "Watch what the local does, then listen for the words that match."}</p>}
          <div className="answer-grid observation-controls">
            {observationIndex > 0 && <button type="button" className="game-button" disabled={busy}
              onClick={() => observe(lines[observationIndex - 1])}><PixelIcon name="back" /> Previous</button>}
            {dialogue && <button type="button" className="game-button" disabled={busy} onClick={() => onListen(dialogue)}>
              <PixelIcon name="sound" /> Replay line
            </button>}
            {nextObservation && <button type="button" className="game-button primary" disabled={busy}
              onClick={() => observe(nextObservation)}><PixelIcon name="right" /> {nextObservation.observation?.label ?? "Next observation"}</button>}
            {!nextObservation && lines.every(({ id }) => observed.includes(id)) &&
              <p className="field-label observation-complete"><PixelIcon name="check" /> All clues here collected</p>}
          </div>
        </motion.div>
      )}
    </div>
  );
}
