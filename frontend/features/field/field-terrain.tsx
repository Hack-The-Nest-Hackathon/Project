import { useEffect, useRef } from "react";
import { fieldRegion, landmarks, landingSpot, trailDistanceSquared, trailLimit, trailWidth } from "./field-layout";
import type { Scene } from "../../lib/api/world";

const palettes = {
  market: { trail: "#b5896e", rim: "#674850", dark: "#362842", mid: "#846056", light: "#fac480", prop: "awning" },
  outpost: { trail: "#848298", rim: "#463e60", dark: "#292741", mid: "#575574", light: "#9ef2cf", prop: "relay" },
  harbor: { trail: "#6d9b99", rim: "#254854", dark: "#172f4d", mid: "#317587", light: "#8ddecc", prop: "reeds" },
  highland: { trail: "#a79cae", rim: "#4d4868", dark: "#362f52", mid: "#645f90", light: "#d4caff", prop: "pine" },
  dune: { trail: "#c89a73", rim: "#715062", dark: "#4e384f", mid: "#a56554", light: "#ffd690", prop: "cactus" },
} as const;

export default function FieldTerrain({ scene }: { scene: Scene }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const surface = canvas.current;
    const ctx = surface?.getContext("2d");
    if (!surface || !ctx) return;
    const palette = palettes[fieldRegion(scene)];
    const seed = Array.from(scene.id).reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619), 2166136261);

    function paint(surface: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
      const w = surface.width = Math.max(1, Math.ceil(surface.clientWidth / 3));
      const h = surface.height = Math.max(1, Math.ceil(surface.clientHeight / 3));
      const x = (value: number) => value * w / 100;
      const y = (value: number) => value * h / 100;
      const unit = Math.min(w, h) / 100;
      let state = seed;
      const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);

      function pixel(px: number, py: number, width: number, height: number, color: string) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(px), Math.round(py), Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
      }

      // Draw the path and its shoulder on the native pixel grid used by the sprites.
      for (let row = Math.floor(h * .36); row < h * .79; row++) {
        for (let column = 0; column < w; column++) {
          const distance = trailDistanceSquared({ x: (column + .5) / w * 100, y: (row + .5) / h * 100 });
          if (distance > trailLimit ** 2) continue;
          const speckle = random();
          const onPath = distance < trailWidth ** 2;
          const color = onPath ? (speckle < .045 ? palette.light : palette.trail)
            : (speckle < .12 ? palette.mid : palette.rim);
          pixel(column, row, 1, 1, color);
        }
      }

      for (const { x: cx, y: cy, footprint } of landmarks) {
        const radiusX = x(footprint.width);
        const radiusY = y(footprint.depth);
        const row = Math.max(2, Math.floor(unit * 2));
        for (let offset = -radiusY; offset < radiusY; offset += row) {
          const halfWidth = radiusX * Math.sqrt(Math.max(0, 1 - (offset / radiusY) ** 2));
          pixel(x(cx) - halfWidth, y(cy) + offset, halfWidth * 2, row, palette.dark);
          if (halfWidth > 4) pixel(x(cx) - halfWidth + 2, y(cy) + offset, halfWidth * 2 - 4, row, palette.mid);
        }
        for (let index = 0; index < 24; index++) {
          const dx = (random() - .5) * radiusX * 1.55;
          const dy = (random() - .5) * radiusY * 1.3;
          if (palette.prop === "reeds") {
            pixel(x(cx) + dx, y(cy) + dy, Math.max(2, unit * (2 + random() * 6)), 1, palette.light);
          } else {
            const size = Math.max(1, Math.round(unit * (1 + random() * 1.5)));
            pixel(x(cx) + dx, y(cy) + dy, size * 3, size, palette.dark);
            pixel(x(cx) + dx + size, y(cy) + dy - size, size, size, palette.light);
          }
        }
      }

      const propSize = Math.max(1, Math.round(unit));
      function scenery(px: number, py: number, size: number) {
        const draw = (dx: number, dy: number, width: number, height: number, color: string) =>
          pixel(px + dx * size, py + dy * size, width * size, height * size, color);
        draw(-4, 0, 8, 1, palette.dark);
        if (palette.prop === "awning") {
          draw(-4, -5, 8, 5, palette.dark);
          draw(-5, -7, 10, 3, palette.light);
          for (let stripe = -4; stripe < 5; stripe += 3) draw(stripe, -7, 1, 3, palette.mid);
          draw(-3, -3, 6, 1, palette.trail);
        } else if (palette.prop === "relay") {
          draw(-3, -3, 6, 3, palette.mid);
          draw(-1, -9, 2, 6, palette.dark);
          draw(-3, -9, 6, 2, palette.mid);
          draw(0, -9, 1, 1, palette.light);
        } else if (palette.prop === "pine") {
          draw(-1, -4, 2, 4, palette.dark);
          draw(-4, -6, 8, 3, palette.dark);
          draw(-3, -8, 6, 3, palette.mid);
          draw(-2, -10, 4, 3, palette.mid);
          draw(-1, -11, 2, 2, palette.light);
        } else if (palette.prop === "reeds") {
          for (const [dx, height] of [[-3, 4], [-1, 8], [1, 6], [3, 5]]) {
            draw(dx, -height, 1, height, palette.mid);
            draw(dx, -height, 1, 2, palette.light);
          }
          draw(-3, -1, 7, 1, palette.trail);
        } else {
          draw(-1, -8, 2, 8, palette.mid);
          draw(-3, -6, 1, 4, palette.light);
          draw(-3, -3, 6, 1, palette.mid);
          draw(2, -6, 1, 4, palette.light);
          draw(0, -8, 1, 1, palette.light);
        }
      }

      for (let index = 0; index < 25; index++) {
        const px = random() * 98 + 1;
        const py = index < 16 ? 30 + random() * 7 : 80 + random() * 16;
        scenery(x(px), y(py), propSize * (random() > .68 ? 2 : 1));
      }
      for (const px of [9, 30, 65, 91]) scenery(x(px), y(43 + random() * 3), propSize);

      for (const px of [11, 22, 47, 71, 88]) {
        const py = px < 23 ? 59 - (px - 11) * 1.4 : px === 88 ? 60 : 44;
        pixel(x(px) - 1, y(py) - 3, 2, 4, palette.dark);
        pixel(x(px) - 1, y(py) - 4, 2, 2, palette.light);
      }

      const padWidth = 7;
      for (let row = -3; row <= 3; row++) {
        const half = padWidth - Math.abs(row) * 1.2;
        pixel(x(landingSpot.x - half), y(landingSpot.y + row), x(half * 2), y(1) + 1, palette.dark);
      }
      for (const offset of [-4, 4]) {
        pixel(x(landingSpot.x + offset), y(landingSpot.y + 2), Math.max(2, unit * 2), 1, palette.light);
      }

    }

    const resize = () => paint(surface, ctx);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    return () => observer.disconnect();
  }, [scene]);

  return <canvas ref={canvas} className="field-terrain" aria-hidden="true" />;
}
