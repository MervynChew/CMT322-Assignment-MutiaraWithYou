import { ROAD_ANCHORS } from "./mock-data";
import type { LatLng, Roadblock } from "./types";

const R = 6_371_000; // earth radius, metres
const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance in metres from point p to segment ab (equirectangular projection, fine at city scale). */
export function distanceToSegment(p: LatLng, a: LatLng, b: LatLng): number {
  const kx = Math.cos(toRad(p.lat)) * 111_320;
  const ky = 110_540;
  const ax = (a.lng - p.lng) * kx;
  const ay = (a.lat - p.lat) * ky;
  const bx = (b.lng - p.lng) * kx;
  const by = (b.lat - p.lat) * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.sqrt(cx * cx + cy * cy);
}

export function distanceToPolyline(p: LatLng, line: LatLng[]): number {
  let min = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    min = Math.min(min, distanceToSegment(p, line[i], line[i + 1]));
  }
  return min;
}

export function polylineLength(line: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < line.length - 1; i++) total += haversine(line[i], line[i + 1]);
  return total;
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export type RouteSuggestion = {
  id: string;
  label: string;
  tag: "Fastest" | "Fewest closures" | "Alternative";
  path: LatLng[];
  roads: string[];
  distanceM: number;
  durationMin: number;
  obstacles: Roadblock[];
};

/** Quadratic bezier between a and b, bowed sideways by `bow` (fraction of leg length). */
function curvedLeg(a: LatLng, b: LatLng, bow: number, samples = 28): LatLng[] {
  const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
  // perpendicular vector to ab
  const ctrl = {
    lat: mid.lat + (b.lng - a.lng) * bow,
    lng: mid.lng - (b.lat - a.lat) * bow,
  };
  const pts: LatLng[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const u = 1 - t;
    pts.push({
      lat: u * u * a.lat + 2 * u * t * ctrl.lat + t * t * b.lat,
      lng: u * u * a.lng + 2 * u * t * ctrl.lng + t * t * b.lng,
    });
  }
  return pts;
}

/** Roads a path passes, in order, plus how many samples fell on each (to find the main road). */
function roadsAlong(path: LatLng[]): { roads: string[]; main: string | null } {
  const roads: string[] = [];
  const hits = new Map<string, number>();
  for (const p of path) {
    let best: { name: string; d: number } | null = null;
    for (const anchor of ROAD_ANCHORS) {
      const d = haversine(p, anchor);
      if (d < 1400 && (!best || d < best.d)) best = { name: anchor.name, d };
    }
    if (!best) continue;
    hits.set(best.name, (hits.get(best.name) ?? 0) + 1);
    if (!roads.includes(best.name)) roads.push(best.name);
  }
  const main = [...hits.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { roads: roads.length ? roads : ["Local roads"], main };
}

/** How close a route must pass to a drawn closed stretch to count as going through it. */
const STRETCH_HIT_M = 150;

/**
 * Does a route pass through this roadblock? Drawn stretches decide when there
 * are any; otherwise the blocked zone around the pin (its radius) does.
 */
export function routeHits(rb: Roadblock, path: LatLng[]): boolean {
  if (rb.segments?.length) return rb.segments.some((seg) => path.some((p) => distanceToPolyline(p, seg.path) < STRETCH_HIT_M));
  return distanceToPolyline(rb, path) < rb.radiusM;
}

/**
 * Generates three route suggestions through the given stops and flags the
 * active roadblocks each one passes through.
 */
export function suggestRoutes(stops: LatLng[], roadblocks: Roadblock[]): RouteSuggestion[] {
  if (stops.length < 2) return [];
  const live = roadblocks.filter((rb) => rb.status === "active");
  const variants = [
    { id: "r-direct", bow: 0.04 },
    { id: "r-east", bow: -0.32 },
    { id: "r-west", bow: 0.3 },
  ];

  const routes = variants.map(({ id, bow }) => {
    const path: LatLng[] = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const leg = curvedLeg(stops[i], stops[i + 1], bow);
      path.push(...(i === 0 ? leg : leg.slice(1)));
    }
    const distanceM = polylineLength(path) * 1.18; // road network detour factor
    const obstacles = live.filter((rb) => routeHits(rb, path));
    const delay = obstacles.reduce((s, rb) => s + (rb.closure === "full" ? 9 : 4), 0);
    const durationMin = Math.max(3, Math.round((distanceM / 1000 / 38) * 60 + delay));
    const { roads, main } = roadsAlong(path);
    return { id, path, distanceM, durationMin, obstacles, roads, main };
  });

  const byTime = [...routes].sort((a, b) => a.durationMin - b.durationMin);
  const fastest = byTime[0];
  const fewest = [...routes]
    .filter((r) => r !== fastest)
    .sort((a, b) => a.obstacles.length - b.obstacles.length || a.durationMin - b.durationMin)[0];
  const other = routes.find((r) => r !== fastest && r !== fewest)!;

  const tagged: [typeof fastest, RouteSuggestion["tag"]][] = [
    [fastest, "Fastest"],
    [fewest, "Fewest closures"],
    [other, "Alternative"],
  ];
  const used = new Set<string>();
  return tagged.map(([{ main, ...r }, tag]) => {
    // Prefer a distinct "via" road per route so the three options are easy to tell apart.
    const via = [main, ...r.roads].find((x) => x && x !== "Local roads" && !used.has(x)) ?? main ?? "local roads";
    used.add(via);
    return { ...r, tag, label: `via ${via}` };
  });
}

/** How far any drawn stretch reaches from the pin, in metres (0 when nothing is drawn). */
export function segmentReach(pin: LatLng, segments: { path: LatLng[] }[] = []): number {
  let far = 0;
  for (const s of segments) for (const p of s.path) far = Math.max(far, haversine(pin, p));
  return far;
}

/** Two opposite corners of the square around a circle (for fitting the map to it). */
export function circleBounds(c: LatLng, radiusM: number): LatLng[] {
  const dLat = radiusM / 110_540;
  const dLng = radiusM / (111_320 * Math.cos((c.lat * Math.PI) / 180));
  return [
    { lat: c.lat + dLat, lng: c.lng + dLng },
    { lat: c.lat - dLat, lng: c.lng - dLng },
  ];
}
