import type { Scene } from "../../lib/api/world";

export type Position = { x: number; y: number };
export type Footprint = { width: number; depth: number; offsetY: number };
export type Stop = Position & { name: string; footprint: Footprint };

export const landingSpot = { x: 21, y: 67 };
export const trail: Position[] = [
  { x: 21, y: 72 }, { x: 12, y: 61 }, { x: 15, y: 54 }, { x: 23, y: 43 },
  { x: 34, y: 46 }, { x: 47, y: 42 }, { x: 60, y: 43 }, { x: 73, y: 46 },
  { x: 85, y: 52 }, { x: 88, y: 62 }, { x: 77, y: 70 }, { x: 63, y: 67 },
  { x: 52, y: 73 }, { x: 37, y: 70 },
];

export const trailWidth = 3.1;
export const trailLimit = 5.9;
const trailSegments = trail.map((start, index) => {
  const end = trail[(index + 1) % trail.length];
  const dx = end.x - start.x;
  const dy = (end.y - start.y) * 1.5;
  return { start, dx, dy, length: dx * dx + dy * dy };
});

// Measure the path and landing spur in the same coordinates used by the terrain renderer.
export function trailDistanceSquared(point: Position) {
  let nearest = ((point.x - landingSpot.x) * .65) ** 2 + ((point.y - landingSpot.y - 1) * 1.05) ** 2;
  for (const { start, dx, dy, length } of trailSegments) {
    const x = point.x - start.x;
    const y = (point.y - start.y) * 1.5;
    const t = Math.max(0, Math.min(1, (x * dx + y * dy) / length));
    nearest = Math.min(nearest, (x - dx * t) ** 2 + (y - dy * t) ** 2);
  }
  return nearest;
}

export function onTrail(point: Position) {
  return trailDistanceSquared(point) <= trailLimit ** 2;
}

export const landmarks: Stop[] = [
  { name: "Basin", x: 48, y: 56, footprint: { width: 19, depth: 8, offsetY: 0 } },
  { name: "Ridge", x: 68, y: 56, footprint: { width: 9, depth: 7, offsetY: 0 } },
];

const stationPoints = [{ x: 17, y: 47 }, { x: 48, y: 38 }, { x: 85, y: 49 }];

export function surveyStations(scene: Scene): Stop[] {
  return [...new Set(scene.clues.map(({ speaker }) => speaker))].map((name, index) => ({
    ...stationPoints[index], name, footprint: { width: 5, depth: 3, offsetY: 0 },
  }));
}

export function fieldRegion(scene: Scene) {
  if (scene.id === "echo-basin") return "basin";
  if (scene.id === "market") return "market";
  if (scene.id === "outpost") return "outpost";
  if (scene.region === "harbor") return "harbor";
  if (scene.region === "highland") return "highland";
  return "dune";
}
