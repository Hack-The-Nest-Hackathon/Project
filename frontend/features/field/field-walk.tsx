import PixelIcon from "../../components/pixel-icon";
import clsx from "clsx";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Clue, Scene } from "../../lib/api/world";
import type { Character } from "../../lib/character";
import CharacterSprite from "../../components/character-sprite";
import SignalPerformance from "./signal-performance";
import ObservationBeat from "./observation-beat";
import FieldTerrain from "./field-terrain";
import RocketLanding from "./rocket-landing";
import { fieldRegion, landmarks, landingSpot, onTrail, surveyStations, trail, type Position, type Stop } from "./field-layout";

type Props = {
  scene: Scene;
  character: Character;
  observed: string[];
  busy: boolean;
  paused: boolean;
  playingClue: string | null;
  getVoice: (id: string) => HTMLAudioElement | null;
  reducedMotion: boolean | null;
  onListen: (clue: Clue) => void;
  onStopAudio: () => void;
  onPlayAudio: (id: string) => void;
  newWordsByClue: ReadonlyMap<string, ReadonlySet<string>>;
  shipReady: boolean;
  landing: boolean;
  onLand: () => void;
  onBoard: () => void;
  onWalk: () => void;
  onPractice: () => void;
};

const directions = {
  left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1],
} as const;
type Direction = keyof typeof directions;
const keys: Record<string, Direction> = {
  arrowleft: "left", a: "left", arrowright: "right", d: "right",
  arrowup: "up", w: "up", arrowdown: "down", s: "down",
};
const introductions: Record<string, string> = {
  Tikk: "Tikk uses clicks and chimes to signal from the lantern station.",
  Mova: "Mova directs couriers with gestures you can watch from the trail.",
  Vey: "Vey carves messages into a stone tablet.",
  Merchant: "The merchant shows you the same fruit in two different quantities. Listen for the word that changes.",
  Baker: "The baker compares one loaf with a group of loaves. Listen for the number.",
  Quartermaster: "The quartermaster loads two kinds of cargo. Listen for what changes when she switches items.",
  Lamplighter: "The lamplighter points to the scout’s lanterns. Compare one lantern with several.",
  Scout: "The scout shows you a different object. Check whether the same quantity pattern applies.",
  Gatekeeper: "The gatekeeper describes the scout’s actions. Compare carrying an object with simply seeing it.",
};
const distance = (a: Position, b: Position) => Math.hypot(a.x - b.x, a.y - b.y);
const withinGround = (x: number, y: number): Position => ({
  x: Math.max(0, Math.min(100, x)),
  y: Math.max(0, Math.min(100, y)),
});

function footprintDistance(point: Position, stop: Stop) {
  const footprint = stop.footprint;
  return Math.hypot(
    (point.x - stop.x) / (footprint?.width ?? 6),
    (point.y - stop.y - (footprint?.offsetY ?? 0)) / (footprint?.depth ?? 6),
  );
}

function blocked(point: Position, stops: Stop[]) {
  return stops.some((stop) => footprintDistance(point, stop) < 1);
}

function followsTrail(from: Position, to: Position) {
  const steps = Math.max(1, Math.ceil(distance(from, to) * 2));
  for (let index = 1; index <= steps; index++) {
    const t = index / steps;
    if (!onTrail({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })) return false;
  }
  return true;
}

function canMove(from: Position, to: Position, stops: Stop[]) {
  return followsTrail(from, to) && stops.every((stop) => {
    const width = stop.footprint?.width ?? 6;
    const depth = stop.footprint?.depth ?? 6;
    const x = (from.x - stop.x) / width;
    const y = (from.y - stop.y - (stop.footprint?.offsetY ?? 0)) / depth;
    const dx = (to.x - from.x) / width;
    const dy = (to.y - from.y) / depth;
    const movementSquared = dx * dx + dy * dy;
    if (!movementSquared) return true;
    const projection = x * dx + y * dy;
    if (x * x + y * y < 1) return projection >= 0;
    const t = Math.max(0, Math.min(1, -projection / movementSquared));
    return Math.hypot(x + dx * t, y + dy * t) >= 1;
  });
}

function routeAround(start: Position, goal: Position, stops: Stop[]): Position[] {
  const clear = (a: Position, b: Position) => !blocked(b, stops) && canMove(a, b, stops);
  if (clear(start, goal)) return [goal];
  // Follow the trail through its bends and around the locals and landing gear.
  const nodes = [start, goal, ...trail, ...stops.flatMap(({ x, y, footprint }) =>
    [-1, 1].flatMap((dx) => [-1, 1].map((dy) => withinGround(
      x + dx * ((footprint?.width ?? 6) + 2),
      y + (footprint?.offsetY ?? 0) + dy * ((footprint?.depth ?? 6) + 2),
    ))))];
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

function routeToTap(start: Position, tap: Position, stops: Stop[], width: number, height: number) {
  if (onTrail(tap) && !blocked(tap, stops)) {
    const direct = routeAround(start, tap, stops);
    if (direct.length) return direct;
  }

  // Rank walkable ground by screen distance, so wide and tall views snap naturally.
  const candidates: { point: Position; distance: number }[] = [];
  for (let y = 36; y <= 79; y++) {
    for (let x = 5; x <= 95; x++) {
      const point = { x, y };
      if (!onTrail(point) || blocked(point, stops)) continue;
      candidates.push({ point, distance: ((x - tap.x) * width) ** 2 + ((y - tap.y) * height) ** 2 });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  for (const { point } of candidates.slice(0, 32)) {
    const route = routeAround(start, point, stops);
    if (route.length) return route;
  }
  return [];
}

const defaultFootprint = { width: 6, depth: 3, offsetY: -1 };

export default function FieldWalk({ scene, character, observed, busy, paused, playingClue, getVoice, reducedMotion, onListen, onStopAudio, onPlayAudio, newWordsByClue, landing, onLand, shipReady, onBoard, onWalk, onPractice }: Props) {
  const [shipFootprint, setShipFootprint] = useState(defaultFootprint);
  const shipStop = useMemo<Stop>(() => ({ ...landingSpot, name: "Survey ship", footprint: shipFootprint }), [shipFootprint]);
  const stations = useMemo(() => surveyStations(scene), [scene]);
  const stops = useMemo(() => [...stations, shipStop, ...landmarks], [stations, shipStop]);
  const nextStation = stations.find(({ name }) => scene.clues.some((clue) => clue.speaker === name && !observed.includes(clue.id)));
  const worldNumber = Number(scene.id.split("-")[1]) || 0;
  const [position, setPosition] = useState<Position>({ x: 33, y: 71 });
  const [warning, setWarning] = useState(false);
  const warningTimeout = useRef<number | undefined>(undefined);
  const [moving, setMoving] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const [speaker, setSpeaker] = useState<string | null>(null);
  const [canSpeak, setCanSpeak] = useState(() => {
    if (typeof window === "undefined" || !window.isSecureContext || !navigator.mediaDevices?.getUserMedia
      || typeof MediaRecorder === "undefined") return false;
    try { return localStorage.getItem("voices-skip-speaking") !== "yes"; } catch { return true; }
  });

  function disableSpeaking() {
    setCanSpeak(false);
    try { localStorage.setItem("voices-skip-speaking", "yes"); } catch { /* Keep the preference for this visit. */ }
  }
  const [dialogue, setDialogue] = useState<Clue | null>(null);
  const held = useRef(new Map<string, Direction>());
  const waypoint = useRef<{ name: string | null; points: Position[] } | null>(null);
  const location = useRef(position);
  const directionFacing = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const rocketSprite = useRef<HTMLSpanElement>(null);
  const boardingPoint = withinGround(shipStop.x, shipStop.y + shipFootprint.offsetY + shipFootprint.depth + 2);
  const inReach = (stop: Stop, point: Position) => stop === shipStop
    ? Math.abs(point.x - boardingPoint.x) < 4 && Math.abs(point.y - boardingPoint.y) < 2.65
      && point.y > shipStop.y + shipFootprint.offsetY + shipFootprint.depth
    : distance(point, stop) < 10;
  const interactionDistance = (stop: Stop) => distance(stop === shipStop ? boardingPoint : stop, position);
  const nearest = [...stations, shipStop].filter((stop) => inReach(stop, position))
    .sort((a, b) => interactionDistance(a) - interactionDistance(b))[0];
  const nearby = useRef(nearest);
  nearby.current = nearest;
  const lines = scene.clues.filter((clue) => clue.speaker === speaker);
  const observationIndex = dialogue ? lines.findIndex(({ id }) => id === dialogue.id) : -1;
  const nextObservation = lines[observationIndex + 1];
  const startObservation = lines.find(({ id }) => !observed.includes(id)) ?? lines[0];

  useEffect(() => {
    const surface = stage.current;
    const rocket = rocketSprite.current;
    if (!surface || !rocket) return;
    const measure = () => {
      if (!surface.clientWidth || !surface.clientHeight) return;
      setShipFootprint({
        width: (rocket.offsetWidth * .44 + 3) / surface.clientWidth * 100,
        depth: (rocket.offsetWidth * .095 + 3) / surface.clientHeight * 100,
        offsetY: -rocket.offsetHeight * .025 / surface.clientHeight * 100,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    observer.observe(rocket);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(warningTimeout.current), []);

  function warnAboutTrail() {
    setWarning(true);
    window.clearTimeout(warningTimeout.current);
    warningTimeout.current = window.setTimeout(() => {
      warningTimeout.current = undefined;
      setWarning(false);
    }, 2200);
  }

  function observe(clue: Clue) {
    setDialogue(clue);
    if (clue.signal) { onStopAudio(); return; }
    if (clue.opening) onPlayAudio(`${clue.id}-hello`);
    else onListen(clue);
  }

  useEffect(() => {
    if (paused || busy || landing) return;
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
        if (Math.hypot(x, y) < .3 && canMove(current, goal, stops)) {
          location.current = goal;
          setPosition(goal);
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
      const steering = goal ? 1 : smoothing;
      velocityX += ((length ? dx / length * movingSpeed : 0) - velocityX) * steering;
      velocityY += ((length ? dy / length * movingSpeed : 0) - velocityY) * steering;
      let advanced = false;
      if (elapsed && Math.hypot(velocityX, velocityY) > 4) {
        const desired = withinGround(current.x + velocityX * elapsed / scale.width, current.y + velocityY * elapsed / scale.height);
        const horizontal = { x: desired.x, y: current.y };
        const vertical = { x: current.x, y: desired.y };
        const next = canMove(current, desired, stops) ? desired
          : !goal && canMove(current, horizontal, stops) ? horizontal
          : !goal && canMove(current, vertical, stops) ? vertical : current;
        if (!goal && held.current.size && !onTrail(desired) && next.x === current.x && next.y === current.y && !warningTimeout.current) {
          warnAboutTrail();
        }
        if (next.x !== current.x || next.y !== current.y) {
          if (!wasMoving) onWalk();
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
  }, [paused, busy, landing, stops, onWalk]);

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
    if (canMove(current, next, stops)) { location.current = next; setPosition(next); onWalk(); }
    else if (!onTrail(next)) warnAboutTrail();
    setSpeaker(null);
    setDialogue(null);
  }

  function approach(stop: typeof stops[number]) {
    if (landing || paused || busy) return;
    held.current.clear();
    setDialogue(null);
    if (inReach(stop, position)) {
      waypoint.current = null;
      setSpeaker(stop.name);
    } else {
      setSpeaker(null);
      const destination = stop === shipStop ? boardingPoint : { x: stop.x, y: stop.y + 5.5 };
      const points = routeAround(location.current, destination, stops);
      waypoint.current = points.length ? { name: stop.name, points } : null;
    }
  }

  return (
    <div className={clsx("field-walk", speaker && speaker !== shipStop.name && "is-conversing")}
      inert={paused} data-region={fieldRegion(scene)} style={{
      "--world-hue": (worldNumber * 137.5) % 360,
      "--world-orb": `url(/worlds/${encodeURIComponent(scene.id)}.png)`,
    } as React.CSSProperties}>
      <div ref={stage} inert={landing} className={clsx("walk-stage", scene.id === "market" && "market-stage", worldNumber > 0 && "generated-stage")}
        onClick={(event) => {
          if (landing || paused || busy || event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const destination = withinGround((event.clientX - bounds.left) / bounds.width * 100, (event.clientY - bounds.top) / bounds.height * 100);
          held.current.clear();
          waypoint.current = null;
          const points = routeToTap(location.current, destination, stops, bounds.width, bounds.height);
          if (!points.length) { warnAboutTrail(); return; }
          setSpeaker(null);
          setDialogue(null);
          waypoint.current = { name: null, points };
        }}>
        {worldNumber > 0 && <div className="field-world-orb" aria-hidden="true" />}
        <div className="walk-ground" aria-hidden="true" />
        <FieldTerrain scene={scene} rocket={rocketSprite} />
        {stations.map((stop, index) => (
          <button type="button" key={stop.name} className="walk-npc" style={{ left: `${stop.x}%`, top: `${stop.y}%`, zIndex: Math.round(stop.y) }}
            aria-label={`Approach ${stop.name}`} aria-pressed={speaker === stop.name} disabled={busy}
            onClick={() => approach(stop)}>
            <span className={clsx("walk-name", stop === nextStation && "next-station")}>
              {stop === nextStation && <span className="station-beacon" aria-hidden="true" />}{stop.name}
            </span>
            <span className={clsx("walk-sprite", `npc-${index}`,
              speaker === stop.name && dialogue && playingClue === dialogue.id && "is-speaking")} aria-hidden="true" />
          </button>
        ))}
        <button type="button" className={clsx("walk-npc survey-ship", landing && "invisible")}
          style={{ left: `${shipStop.x}%`, top: `${shipStop.y}%`, zIndex: Math.round(shipStop.y) }}
          aria-label="Approach the survey ship" disabled={busy} onClick={() => approach(shipStop)}>
          <span className={clsx("walk-name", shipReady && "next-station")}>Survey ship</span>
          <span ref={rocketSprite} className="survey-ship-sprite" aria-hidden="true" />
        </button>
        <span aria-hidden="true" className={clsx("walk-player", landing && "invisible", facingLeft && "faces-left", moving && !reducedMotion && "is-walking")}
          style={{ left: `${position.x}%`, top: `${position.y}%`, zIndex: Math.round(position.y) }}>
          <span className="player-portrait"><CharacterSprite character={character} /></span>
        </span>
      </div>
      {landing && <RocketLanding planet={scene.title} mission={scene.mission} reducedMotion={reducedMotion} onFinish={onLand} />}
      {!landing && warning && <p className="trail-warning" role="status">
        <PixelIcon name="marker" /> Don’t venture too far off the path!
      </p>}
      {!landing && !speaker && <div className="walk-prompt">
        {nearest ? <button className="game-button" disabled={busy} onClick={() => approach(nearest)}>
          <PixelIcon name="chat" /> {nearest === shipStop ? "Contact the survey ship" : `Talk to ${nearest.name}`}
        </button> : <><p>{shipReady ? "Follow the trail back to the ship for your translation check." : nextStation ? `Follow the trail to ${nextStation.name} for your next clue.` : scene.description}</p><p className="field-label">Walk with WASD, arrow keys, or the on-screen pad. Stay near the marked trail. Tap it to walk there or press E near a local.</p></>}
      </div>}
      {!landing && <div className="walk-controls" aria-label="Movement controls">
        {(["up", "left", "down", "right"] as const).map((direction) => (
          <button key={direction} type="button" className={`game-button walk-${direction}`}
            aria-label={`Walk ${direction}`} disabled={busy || paused}
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
      </div>}
      {speaker === shipStop.name && (
        <motion.div className="walk-dialogue" initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <h2>Survey pilot</h2>
          <p className="story-beat"><span>Incoming transmission</span>{shipReady
            ? "You've collected all the local observations. Ready to translate what you heard?"
            : "Follow the trail and collect every local observation before we leave."}</p>
          <div className="answer-grid observation-controls">
            <button type="button" className="game-button" onClick={() => setSpeaker(null)}>Give me a minute</button>
            {shipReady && <button type="button" className="game-button primary" onClick={onBoard}><PixelIcon name="launch" /> I'm ready</button>}
          </div>
        </motion.div>
      )}
      {speaker && speaker !== shipStop.name && (
        <motion.div key={speaker} className="walk-dialogue field-conversation" initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}>
          {!dialogue && <div className="observation-heading">
            <div>
              <h2>{speaker}</h2>
            </div>
            <button type="button" className="conversation-link" disabled={busy} onClick={() => {
              onStopAudio(); setSpeaker(null); setDialogue(null);
            }}>Leave</button>
          </div>}
          {dialogue?.signal ? (
            <section key={dialogue.id} className="signal-encounter" aria-label={dialogue.speaker}>
              <div className="observation-heading">
                <h2>{dialogue.speaker}</h2>
                <button type="button" className="conversation-link" onClick={() => { setSpeaker(null); setDialogue(null); }}>Leave</button>
              </div>
              <p className="conversation-context">{dialogue.context}</p>
              <SignalPerformance signal={dialogue.signal} onComplete={() => onListen(dialogue)} />
              <button type="button" className="game-button primary" disabled={!observed.includes(dialogue.id)}
                onClick={() => {
                  if (nextObservation) observe(nextObservation);
                  else { setSpeaker(null); setDialogue(null); }
                }}>
                {nextObservation ? "See the next clue" : "Finish encounter"} <PixelIcon name="right" />
              </button>
            </section>
          ) : dialogue ? (
            <ObservationBeat key={dialogue.id} clue={dialogue} reducedMotion={reducedMotion}
              languageName={scene.language} sceneId={scene.id} canSpeak={canSpeak}
              disableSpeaking={disableSpeaking} stopAudio={onStopAudio}
              newWords={newWordsByClue.get(dialogue.id)}
              character={character} playingClue={playingClue} getVoice={getVoice} speakerIndex={stations.findIndex(({ name }) => name === speaker)}
              busy={busy} playAudio={onPlayAudio} onPractice={onPractice}
              listen={() => onListen(dialogue)}
              leave={() => { onStopAudio(); setSpeaker(null); setDialogue(null); }}
              continueConversation={() => {
                if (nextObservation) observe(nextObservation);
                else { onStopAudio(); setSpeaker(null); setDialogue(null); }
              }}
              hasNextObservation={Boolean(nextObservation)} />
          ) : <p className="field-label">{introductions[speaker] ?? "Watch what the local does, then listen for the words that match."}</p>}
          {!dialogue && startObservation && <div className="reply-actions">
            <button type="button" className="game-button primary" disabled={busy}
              onClick={() => observe(startObservation)}><PixelIcon name={startObservation.signal ? "eye" : "chat"} /> {startObservation.signal ? "Observe signal" : "Start talking"}</button>
          </div>}
        </motion.div>
      )}
    </div>
  );
}
