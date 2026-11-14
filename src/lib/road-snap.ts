import { haversine } from "./geo";
import type { LatLng } from "./types";

/**
 * Road snapping for the admin drawing tool, backed by the public OSRM demo
 * server (OpenStreetMap road network). Every clicked point must land on a
 * road, and consecutive points are joined by the route along that road, so a
 * drawn closure can never cut across buildings, rivers or open land.
 */
/** Two public OSRM servers with the same API: the second is used when the first is busy or down. */
const OSRM_SERVERS = ["https://router.project-osrm.org", "https://routing.openstreetmap.de/routed-car"];

/** A click further than this from any drivable road is rejected. */
export const MAX_SNAP_M = 35;
/** Other road positions near a click considered when joining it to the previous point (e.g. the other carriageway). */
const ALTERNATIVE_SNAP_M = 45;
/** Points this close are simply joined straight, even if routing can't connect them. */
const STRAIGHT_JOIN_M = 30;
/** Longest stretch a single closure segment may cover. */
export const MAX_SEGMENT_M = 3000;

export class RoadSnapError extends Error {
  constructor(
    public code: "off-road" | "detour" | "too-long" | "too-far" | "network",
    message: string,
  ) {
    super(message);
  }
}

type OsrmWaypoint = { location: [number, number]; name: string; distance: number };
type OsrmRoute = {
  distance: number;
  geometry: { coordinates: [number, number][] };
  legs: { steps: { name: string; distance: number }[] }[];
};

/** Calls the first OSRM server that answers; a busy, failing or slow server falls through to the next. */
async function osrm<T>(path: string): Promise<T> {
  let lastStatus: number | null = null;
  for (const server of OSRM_SERVERS) {
    try {
      const res = await fetch(`${server}${path}`, { signal: AbortSignal.timeout(7000) });
      if (res.ok) return (await res.json()) as T;
      lastStatus = res.status;
    } catch {
      // Unreachable or timed out: try the next server.
    }
  }
  throw new RoadSnapError(
    "network",
    lastStatus
      ? `The road map service is busy (${lastStatus}). Wait a moment and click again.`
      : "The road map service can't be reached. Check your connection and click again.",
  );
}

export type SnappedPoint = {
  point: LatLng;
  road: string;
  offsetM: number;
  /** Other nearby positions on roads (e.g. the opposite carriageway of a divided road). */
  alternatives: LatLng[];
};

/** Moves a click onto the nearest drivable road, or rejects it if it isn't on one. */
export async function snapToRoad(p: LatLng): Promise<SnappedPoint> {
  const data = await osrm<{ code: string; waypoints?: OsrmWaypoint[] }>(
    `/nearest/v1/driving/${p.lng.toFixed(6)},${p.lat.toFixed(6)}?number=4`,
  );
  const [w, ...others] = data.waypoints ?? [];
  if (!w || w.distance > MAX_SNAP_M) {
    const away = w ? ` (${Math.round(w.distance)} m from the nearest road)` : "";
    throw new RoadSnapError("off-road", `That point isn't on a road${away}. Click directly on the street.`);
  }
  const alternatives = others
    .filter((o) => o.distance <= ALTERNATIVE_SNAP_M)
    .map((o) => ({ lat: o.location[1], lng: o.location[0] }))
    .filter((o) => haversine(o, { lat: w.location[1], lng: w.location[0] }) > 3);
  return { point: { lat: w.location[1], lng: w.location[0] }, road: w.name, offsetM: w.distance, alternatives };
}

/** A traced stretch of road, ending at `end` (the clicked point, or a nearby spot on the same road). */
export type TracedLeg = { path: LatLng[]; lengthM: number; roads: string[]; end: LatLng };

async function route(from: LatLng, to: LatLng): Promise<OsrmRoute | null> {
  const data = await osrm<{ code: string; routes?: OsrmRoute[] }>(
    `/route/v1/driving/${from.lng.toFixed(6)},${from.lat.toFixed(6)};${to.lng.toFixed(6)},${to.lat.toFixed(6)}?overview=full&geometries=geojson&steps=true`,
  );
  return data.routes?.[0] ?? null;
}

/** The more direct of driving a→b or b→a (one-way streets only allow one of them). */
async function bestRoute(a: LatLng, b: LatLng) {
  const [forward, backward] = await Promise.all([route(a, b), route(b, a)]);
  if (forward && (!backward || forward.distance <= backward.distance)) return { route: forward, reversed: false };
  if (backward) return { route: backward, reversed: true };
  return null;
}

/**
 * Follows the road from `a` to `b`.
 *
 * Routing is by car, so both directions are tried (one-way streets). On a
 * divided road a click can snap to the opposite carriageway, which is only
 * reachable by a long U-turn; the other road positions near the click are
 * then tried too, and the one on the same carriageway is used. A leg that
 * still has to detour is rejected, so the admin adds points along the street.
 */
export async function traceAlongRoad(a: LatLng, b: LatLng, alternatives: LatLng[] = []): Promise<TracedLeg> {
  const isDirect = (end: LatLng, d: number) => {
    const straight = haversine(a, end);
    return d <= Math.max(straight * 1.5, straight + 70);
  };

  for (const end of [b, ...alternatives]) {
    const best = await bestRoute(a, end);
    if (best && isDirect(end, best.route.distance)) {
      const path = best.route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
      if (best.reversed) path.reverse();
      const roads = best.route.legs.flatMap((l) => l.steps.filter((s) => s.distance > 15 && s.name).map((s) => s.name));
      return { path, lengthM: best.route.distance, roads, end };
    }
  }

  // Two clicks a few metres apart: just join them.
  const straight = haversine(a, b);
  if (straight <= STRAIGHT_JOIN_M) return { path: [a, b], lengthM: straight, roads: [], end: b };

  throw new RoadSnapError(
    "detour",
    "Those two points aren't on the same stretch of road. Click a point further along the same road (not across the divider), or add a point at the corner.",
  );
}

/** Most frequent road name along a drawn segment. */
export function dominantRoad(roads: string[]): string {
  const counts = new Map<string, number>();
  for (const r of roads) if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
  let best = "";
  let max = 0;
  for (const [r, n] of counts) if (n > max) [best, max] = [r, n];
  return best || "Unnamed road";
}

/** Drops consecutive duplicates and rounds to ~1 m so stored paths stay small. */
export function compactPath(path: LatLng[]): LatLng[] {
  const out: LatLng[] = [];
  for (const p of path) {
    const q = { lat: +p.lat.toFixed(5), lng: +p.lng.toFixed(5) };
    const last = out[out.length - 1];
    if (!last || last.lat !== q.lat || last.lng !== q.lng) out.push(q);
  }
  return out;
}
