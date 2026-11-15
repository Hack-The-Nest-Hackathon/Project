import PixelIcon from "../../components/pixel-icon";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import clsx from "clsx";
import type { Scene } from "../../lib/api/world";

const width = 1140;
const height = 940;

function coordinates(index: number) {
  const angle = index * Math.PI * (3 - Math.sqrt(5)) - .6;
  const radius = Math.sqrt(index) * 82;
  return { x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius };
}

type Props = {
  worlds: Scene[];
  current: string;
  selected: string;
  badges: string[];
  reducedMotion: boolean | null;
  onSelect: (id: string) => void;
};

export default function StarChart({ worlds, current, selected, badges, reducedMotion, onSelect }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const nodes = worlds.map((world, index) => ({ world, ...coordinates(index) }));
  const origin = nodes.find(({ world }) => world.id === current) ?? nodes[0];
  const target = nodes.find(({ world }) => world.id === selected) ?? origin;

  useEffect(() => {
    viewport.current?.scrollTo({
      left: target.x * zoom - viewport.current.clientWidth / 2,
      top: target.y * zoom - viewport.current.clientHeight / 2,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }, [target.x, target.y, zoom, reducedMotion]);

  function startPan(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || (event.target as Element).closest("button")) return;
    const element = event.currentTarget;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop };
    element.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function pan(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (start?.id !== event.pointerId) return;
    event.currentTarget.scrollLeft = start.left + start.x - event.clientX;
    event.currentTarget.scrollTop = start.top + start.y - event.clientY;
  }

  function endPan(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
  }

  return (
    <section className="chart-shell" aria-label="Galaxy navigation">
      <div className="chart-tools">
        <p id="chart-instructions">Drag or swipe to explore. Select a planet to plot a route.</p>
        <div className="chart-zoom" aria-label="Map zoom">
          <button className="game-button" aria-label="Zoom out" disabled={zoom <= .75}
            onClick={() => setZoom((level) => Math.max(.75, level - .25))}><PixelIcon name="minus" /></button>
          <button className="game-button" aria-label="Zoom in" disabled={zoom >= 1.5}
            onClick={() => setZoom((level) => Math.min(1.5, level + .25))}><PixelIcon name="plus" /></button>
        </div>
      </div>
      <div ref={viewport} tabIndex={0} role="region" aria-label="Scrollable star chart" aria-describedby="chart-instructions"
        className={clsx("chart-viewport", dragging && "is-dragging")}
        onPointerDown={startPan} onPointerMove={pan} onPointerUp={endPan}
        onPointerCancel={endPan} onLostPointerCapture={endPan}>
        <div className="chart-space" style={{ width: width * zoom, height: height * zoom }}>
          <svg className="chart-routes" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
            {nodes.slice(1).map((node, index) => {
              const neighbor = nodes.slice(0, index + 1).reduce((nearest, candidate) =>
                Math.hypot(node.x - candidate.x, node.y - candidate.y) <
                Math.hypot(node.x - nearest.x, node.y - nearest.y) ? candidate : nearest);
              return <line key={node.world.id} x1={neighbor.x} y1={neighbor.y}
                x2={node.x} y2={node.y} className="chart-link" />;
            })}
            {origin !== target && (
              <g key={target.world.id}>
                <motion.path d={`M ${origin.x},${origin.y} L ${target.x},${target.y}`}
                  className="chart-flight" initial={reducedMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }} transition={{ duration: reducedMotion ? 0 : .55 }} />
                {!reducedMotion && (
                  <motion.circle r={3} fill="#ffb690" initial={{ cx: origin.x, cy: origin.y }}
                    animate={{ cx: target.x, cy: target.y, opacity: [0, 1, 1, 0] }}
                    transition={{ duration: .85, ease: "linear", repeat: Infinity, repeatDelay: 1.2 }} />
                )}
              </g>
            )}
          </svg>
          {nodes.map(({ world, x, y }) => {
            const locked = world.requiredBadges > badges.length;
            const active = world.id === selected;
            return (
              <button key={world.id} type="button"
                className={clsx("chart-world", active && "is-selected", locked && "is-locked", world.id === current && "is-current")}
                style={{ left: x * zoom, top: y * zoom }}
                aria-pressed={active}
                aria-label={`${world.title}${world.id === current ? ", current location" : ""}${locked ? `, requires ${world.requiredBadges} badges` : ""}`}
                onClick={() => onSelect(world.id)}>
                <span className="planet-icon" data-world={world.id} style={world.id === "echo-basin" ? undefined : { backgroundImage: `url(/worlds/${encodeURIComponent(world.id)}.png)` }} aria-hidden="true" />
                <span className="chart-world-name">{locked && <PixelIcon name="lock" />}{world.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
