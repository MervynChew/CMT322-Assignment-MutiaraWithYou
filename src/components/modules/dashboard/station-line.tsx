"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Construction, MapPin, Navigation, Ruler, TrainFront, Warehouse } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PhaseStepper } from "@/components/shared/phase-stepper";
import { cn } from "@/lib/utils";
import { CONSTRUCTION_PHASES, LRT_ROUTES, LRT_STATIONS, stationByCode } from "@/lib/mock-data";
import { formatDistance, haversine } from "@/lib/geo";
import type { Station } from "@/lib/types";
import { useStore } from "@/store/useStore";

/* ------------------------------------------------------------------ */
/* Network: which stations are next to each other                      */
/* ------------------------------------------------------------------ */

const NEIGHBOURS = new Map<string, string[]>();
for (const route of LRT_ROUTES) {
  route.stations.forEach((code, i) => {
    const next = route.stations[i + 1];
    if (!next) return;
    NEIGHBOURS.set(code, [...(NEIGHBOURS.get(code) ?? []), next]);
    NEIGHBOURS.set(next, [...(NEIGHBOURS.get(next) ?? []), code]);
  });
}

/** Stations passed through, in order, travelling from `from` to `to`. */
function stationsBetween(from: string, to: string): string[] {
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const at = queue.shift()!;
    if (at === to) break;
    for (const n of NEIGHBOURS.get(at) ?? []) {
      if (prev.has(n)) continue;
      prev.set(n, at);
      queue.push(n);
    }
  }
  const out: string[] = [];
  for (let at: string | null | undefined = to; at; at = prev.get(at)) out.unshift(at);
  return out[0] === from ? out : [from];
}

/** Starting points offered for the trace: the two northern ends of the line. */
const STARTS = ["S31", "S20"] as const;

/* ------------------------------------------------------------------ */
/* Diagram layouts (wide: the route loop; tall: a single spine)        */
/* ------------------------------------------------------------------ */

type Pt = { x: number; y: number };
type LabelSide = "above" | "below" | "right" | "left";
type Layout = {
  w: number;
  h: number;
  node: number; // px
  nodes: Record<string, Pt & { side: LabelSide }>;
  /** Bends between two neighbouring stations, keyed "A|B" in route order. */
  bends: Record<string, Pt[]>;
  legend?: Pt;
};

const WIDE: Layout = (() => {
  const top = 150;
  const bottom = 470;
  const right = 880;
  const nodes: Layout["nodes"] = {
    S31: { x: 150, y: 28, side: "right" },
    S30: { x: 150, y: 88, side: "right" },
    S19: { x: 150, y: top, side: "left" },
    S20: { x: 150, y: 290, side: "right" },
  };
  ["S18", "S17", "S16", "S15", "S14", "S13", "S12"].forEach((c, i) => (nodes[c] = { x: 245 + i * 90, y: top, side: "below" }));
  ["S11", "S10", "S09", "S08"].forEach((c, i) => (nodes[c] = { x: right, y: 214 + i * 64, side: "right" }));
  ["S07", "S06", "S05", "S04", "S03", "S02", "A01"].forEach((c, i) => (nodes[c] = { x: 785 - i * 90, y: bottom, side: "above" }));
  return {
    w: 1000,
    h: 510,
    node: 36,
    nodes,
    bends: {
      "S12|S11": [{ x: right, y: top }],
      "S08|S07": [{ x: right, y: bottom }],
    },
    legend: { x: 515, y: 310 },
  };
})();

const TALL: Layout = (() => {
  const spine = 100;
  const nodes: Layout["nodes"] = {
    S31: { x: spine, y: 28, side: "right" },
    S30: { x: spine, y: 84, side: "right" },
    S19: { x: spine, y: 146, side: "right" },
    S20: { x: 34, y: 146, side: "below" },
  };
  const main = LRT_ROUTES.find((r) => r.id === "main")!.stations;
  main.slice(main.indexOf("S19") + 1).forEach((c, i) => (nodes[c] = { x: spine, y: 206 + i * 50, side: "right" }));
  const last = Math.max(...Object.values(nodes).map((n) => n.y));
  return { w: 340, h: last + 34, node: 32, nodes, bends: {} };
})();

/* Geometry: rounded polylines sampled into dense points (for drawing and the moving train). */

const CORNER = 46;

function roundedPolyline(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, c, b] = [pts[i - 1], pts[i], pts[i + 1]];
    const la = Math.hypot(c.x - a.x, c.y - a.y);
    const lb = Math.hypot(b.x - c.x, b.y - c.y);
    const r = Math.min(CORNER, la / 2, lb / 2);
    const p0 = { x: c.x + ((a.x - c.x) / la) * r, y: c.y + ((a.y - c.y) / la) * r };
    const p2 = { x: c.x + ((b.x - c.x) / lb) * r, y: c.y + ((b.y - c.y) / lb) * r };
    for (let s = 0; s <= 10; s++) {
      const t = s / 10;
      const u = 1 - t;
      out.push({ x: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p2.y });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function edgePoints(layout: Layout, from: string, to: string): Pt[] {
  const a = layout.nodes[from];
  const b = layout.nodes[to];
  const fwd = layout.bends[`${from}|${to}`];
  if (fwd) return roundedPolyline([a, ...fwd, b]);
  const back = layout.bends[`${to}|${from}`];
  if (back) return roundedPolyline([b, ...back, a]).reverse();
  return [a, b];
}

/** Points along a list of stations, plus the distance (in diagram units) at which each station is reached. */
function trackAlong(layout: Layout, codes: string[]) {
  const pts: Pt[] = [layout.nodes[codes[0]]];
  const arrive: number[] = [0];
  let len = 0;
  for (let i = 1; i < codes.length; i++) {
    const seg = edgePoints(layout, codes[i - 1], codes[i]);
    for (let k = 1; k < seg.length; k++) {
      len += Math.hypot(seg[k].x - seg[k - 1].x, seg[k].y - seg[k - 1].y);
      pts.push(seg[k]);
    }
    arrive.push(len);
  }
  return { pts, arrive, len };
}

const toD = (pts: Pt[]) => (pts.length ? `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L")}` : "");

/** The first `dist` units of a track, and the point reached. */
function cut(pts: Pt[], dist: number): { pts: Pt[]; at: Pt } {
  const out: Pt[] = [pts[0]];
  let left = dist;
  for (let i = 1; i < pts.length; i++) {
    const step = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (step >= left) {
      const t = step === 0 ? 0 : left / step;
      const at = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
      out.push(at);
      return { pts: out, at };
    }
    left -= step;
    out.push(pts[i]);
  }
  return { pts: out, at: pts[pts.length - 1] };
}

/** Places a station's name beside its node, sized to the room the diagram leaves there. */
function labelStyle(layout: Layout, at: Pt & { side: LabelSide }, size: number): React.CSSProperties {
  const gap = size / 2 + 6;
  const font = layout === TALL ? "14px" : "clamp(11px, 1.35cqw, 13px)";
  switch (at.side) {
    case "below":
      return { top: gap, width: "8.6cqw", fontSize: font };
    case "above":
      return { bottom: gap, width: "8.6cqw", fontSize: font };
    case "right":
      return { left: gap, maxWidth: `${((layout.w - at.x) / layout.w) * 100 - 4}cqw`, fontSize: font };
    case "left":
      return { right: gap, maxWidth: `${(at.x / layout.w) * 100 - 3}cqw`, fontSize: font };
  }
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const ringColor = (progress: number) => (progress >= 80 ? "#10b981" : progress >= 45 ? "#2563eb" : "#f59e0b");
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/* ------------------------------------------------------------------ */
/* One diagram                                                         */
/* ------------------------------------------------------------------ */

function NetworkDiagram({
  layout,
  path,
  selected,
  run,
  onSelect,
  className,
}: {
  layout: Layout;
  path: string[];
  selected: string;
  run: number;
  onSelect: (code: string) => void;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const travelRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const headRef = useRef<HTMLSpanElement>(null);

  const routes = useMemo(() => LRT_ROUTES.map((r) => ({ id: r.id, d: toD(trackAlong(layout, r.stations).pts) })), [layout]);
  const track = useMemo(() => trackAlong(layout, path), [layout, path]);
  const onPath = new Set(path);
  const end = track.pts[track.pts.length - 1];

  // Replays the trip: the line grows from the start, the train follows it, and each station fills as it's reached.
  useLayoutEffect(() => {
    const host = hostRef.current;
    const travel = travelRef.current;
    const glow = glowRef.current;
    const head = headRef.current;
    if (!host || !travel || !glow || !head || track.len === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const stations = path.map((code) => host.querySelector<HTMLElement>(`[data-station="${code}"]`));
    stations.forEach((el, i) => el?.setAttribute("data-reached", i === 0 ? "true" : "false"));
    const duration = Math.min(2600, 450 + track.len * 1.6);
    let raf = 0;
    const t0 = performance.now();

    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const dist = ease(t) * track.len;
      const { pts, at } = cut(track.pts, dist);
      const d = toD(pts);
      travel.setAttribute("d", d);
      glow.setAttribute("d", d);
      head.style.left = pct(at.x, layout.w);
      head.style.top = pct(at.y, layout.h);
      track.arrive.forEach((a, i) => {
        if (a <= dist + 0.5) stations[i]?.setAttribute("data-reached", "true");
      });
      if (t < 1) raf = requestAnimationFrame(frame);
      // The train fades away once it arrives, uncovering the station.
      else head.style.opacity = "0";
    };
    head.style.opacity = "1";
    // Draw the starting state before the browser paints, then animate.
    frame(t0);
    return () => cancelAnimationFrame(raf);
    // `run` replays the same trip when the selected station is tapped again.
  }, [track, path, layout, run]);

  const finalD = toD(track.pts);

  return (
    // Labels are sized in container units (cqw) so they scale with the diagram and never collide.
    <div ref={hostRef} className={cn("@container relative w-full", className)} style={{ aspectRatio: `${layout.w} / ${layout.h}` }}>
      <svg aria-hidden viewBox={`0 0 ${layout.w} ${layout.h}`} className="absolute inset-0 size-full overflow-visible">
        {routes.map((r) => (
          <path
            key={r.id}
            d={r.d}
            fill="none"
            stroke={r.id === "link" ? "#bae6fd" : "#dbe3ee"}
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <path ref={glowRef} d={finalD} fill="none" stroke="#60a5fa" strokeOpacity={0.35} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
        <path ref={travelRef} d={finalD} fill="none" stroke="#1d4ed8" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Moving train */}
      <span
        ref={headRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute z-20 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue-800 text-white opacity-0 shadow-lg ring-4 ring-blue-200 transition-opacity duration-500",
          track.len === 0 && "hidden",
        )}
        style={{ left: pct(end.x, layout.w), top: pct(end.y, layout.h) }}
      >
        <TrainFront className="size-3.5" />
      </span>

      {LRT_STATIONS.map((s) => {
        const at = layout.nodes[s.code];
        if (!at) return null;
        const isSel = s.code === selected;
        const size = s.interchange ? layout.node + 8 : layout.node;
        const tags = [s.interchange && "Interchange", s.provisional && "Provisional", s.depot && "Depot"].filter(Boolean).join(" · ");
        return (
          <div
            key={s.code}
            data-station={s.code}
            data-reached={onPath.has(s.code) ? "true" : "false"}
            data-selected={isSel}
            className="mu-station absolute z-10"
            style={{ left: pct(at.x, layout.w), top: pct(at.y, layout.h) }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelect(s.code)}
                  aria-pressed={isSel}
                  aria-label={`${s.code} ${s.name}${tags ? `, ${tags}` : ""}. Phase ${s.phaseIndex + 1}: ${CONSTRUCTION_PHASES[s.phaseIndex]}, ${s.progress}% built`}
                  className={cn(
                    "absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full p-[3px] shadow-sm transition-transform duration-300 outline-none hover:scale-110 focus-visible:scale-110 focus-visible:ring-4 focus-visible:ring-blue-300",
                    s.interchange && "ring-4 ring-amber-300",
                    isSel && "scale-110",
                  )}
                  style={{
                    width: size,
                    height: size,
                    background: `conic-gradient(${ringColor(s.progress)} ${s.progress}%, #e2e8f0 0)`,
                  }}
                >
                  {isSel && <span aria-hidden className="mu-station-ping absolute -inset-1.5 rounded-full border-2 border-blue-500" />}
                  <span className="mu-station-core flex size-full items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-600">
                    {s.code}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-center">
                <span className="block text-xs opacity-80">
                  {s.code} · {s.progress}% built
                </span>
                <span className="block font-semibold">{s.name}</span>
                <span className="block opacity-90">
                  Phase {s.phaseIndex + 1}: {CONSTRUCTION_PHASES[s.phaseIndex]}
                </span>
                {tags && <span className="block text-xs opacity-80">{tags}</span>}
              </TooltipContent>
            </Tooltip>

            <span
              className={cn(
                "pointer-events-none absolute leading-tight",
                (at.side === "below" || at.side === "above") && "-translate-x-1/2 text-center",
                (at.side === "right" || at.side === "left") && "top-0 w-max -translate-y-1/2",
                at.side === "left" && "text-right",
              )}
              style={labelStyle(layout, at, size)}
            >
              <span className={cn("block font-medium transition-colors", isSel ? "font-semibold text-blue-800" : onPath.has(s.code) ? "text-slate-900" : "text-slate-500")}>
                {s.name}
              </span>
              {tags && <span className={cn("block text-[11px] font-medium", s.interchange ? "text-amber-700" : "text-slate-400")}>{tags}</span>}
            </span>
          </div>
        );
      })}

      {layout.legend && (
        <div
          className="absolute hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-xs text-slate-500 md:flex"
          style={{ left: pct(layout.legend.x, layout.w), top: pct(layout.legend.y, layout.h) }}
        >
          <Legend />
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
      <li className="flex items-center gap-1.5">
        <span className="h-1.5 w-6 rounded-full bg-[#dbe3ee]" /> KOMTAR – PSR-A
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-1.5 w-6 rounded-full bg-sky-200" /> Penang Sentral link
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-full bg-white ring-[3px] ring-amber-300" /> Interchange
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-full" style={{ background: "conic-gradient(#2563eb 60%, #e2e8f0 0)" }} /> Ring = % built
      </li>
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

function lineDistance(codes: string[]) {
  let m = 0;
  for (let i = 1; i < codes.length; i++) m += haversine(stationByCode(codes[i - 1])!, stationByCode(codes[i])!);
  return m;
}

const NEARBY_M = 1500;

/**
 * Mutiara LRT stations as a route map: the KOMTAR – PSR-A route and the
 * Penang Sentral link meeting at Macallum. Selecting a station replays the
 * trip from the chosen start to it, filling each station as the train arrives.
 */
export function StationLine() {
  const roadblocks = useStore((s) => s.roadblocks);
  const [start, setStart] = useState<(typeof STARTS)[number]>("S31");
  const [selected, setSelected] = useState<string>("S31");
  // Bumped on every tap so choosing the same station again replays the trip.
  const [run, setRun] = useState(0);

  const station = stationByCode(selected)!;
  const startStation = stationByCode(start)!;
  const path = useMemo(() => stationsBetween(start, selected), [start, selected]);
  const stops = path.length - 1;
  const avg = Math.round(LRT_STATIONS.reduce((s, x) => s + x.progress, 0) / LRT_STATIONS.length);

  const nearby = useMemo(
    () => roadblocks.filter((r) => r.status !== "completed" && haversine(r, station) <= NEARBY_M),
    [roadblocks, station],
  );

  function select(code: string) {
    setSelected(code);
    setRun((r) => r + 1);
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-blue-700 uppercase">Mutiara LRT line</p>
          <h2 className="text-2xl font-bold tracking-tight">Station progress</h2>
          <p className="mt-0.5 text-sm text-slate-500">Tap a station to see its progress and trace the trip from {startStation.name}.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/70">
          <TrainFront className="size-3.5 text-blue-700" /> {LRT_STATIONS.length} stations · {avg}% built on average
        </span>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <span className="text-sm font-medium text-slate-600">Start from</span>
          <div role="radiogroup" aria-label="Start the trip from" className="flex rounded-full bg-slate-100 p-1">
            {STARTS.map((code) => {
              const s = stationByCode(code)!;
              const on = start === code;
              return (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setStart(code);
                    setRun((r) => r + 1);
                  }}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-300",
                    on ? "bg-white text-blue-800 shadow-sm" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Route map: the loop on wide screens, one spine on phones */}
        <div className="px-3 pt-5 pb-4 sm:px-5">
          <NetworkDiagram layout={WIDE} path={path} selected={selected} run={run} onSelect={select} className="hidden md:block" />
          <NetworkDiagram layout={TALL} path={path} selected={selected} run={run} onSelect={select} className="mx-auto max-w-sm md:hidden" />
          <div className="mt-4 md:hidden">
            <Legend />
          </div>
        </div>

        {/* Selected station details */}
        <StationDetails key={selected} station={station} nearby={nearby.map((r) => r.road)} stops={stops} start={startStation} distanceM={lineDistance(path)} />
      </div>
    </section>
  );
}

function StationDetails({
  station,
  nearby,
  stops,
  start,
  distanceM,
}: {
  station: Station;
  nearby: string[];
  stops: number;
  start: Station;
  distanceM: number;
}) {
  const tags = [
    station.interchange && { label: "Interchange", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
    station.provisional && { label: "Provisional station", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
    station.depot && { label: "Depot nearby", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
  ].filter(Boolean) as { label: string; cls: string }[];

  return (
    <div className="animate-rise-in border-t border-slate-100 bg-linear-to-br from-blue-50/60 via-white to-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-blue-700 px-2 py-0.5 font-mono font-semibold text-white">{station.code}</span>
            {tags.map((t) => (
              <span key={t.label} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1", t.cls)}>
                {t.label === "Depot nearby" && <Warehouse className="size-3" />}
                {t.label}
              </span>
            ))}
          </p>
          <h3 className="mt-1.5 text-xl font-bold tracking-tight">{station.name}</h3>
          <p className="mt-0.5 text-sm text-slate-600">{station.note}</p>
        </div>
        <Link
          href={`/map?station=${station.code}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-800/25 transition-colors hover:bg-blue-800"
        >
          <Navigation className="size-4" /> View on map
        </Link>
      </div>

      {station.nearby?.length ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Nearby">
          {station.nearby.map((n) => (
            <li key={n} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
              <MapPin className="size-3 text-rose-500" /> {n}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4">
        <p className="mb-1.5 text-xs text-slate-500">
          Phase {station.phaseIndex + 1} of {CONSTRUCTION_PHASES.length}:{" "}
          <span className="font-medium text-blue-800">{CONSTRUCTION_PHASES[station.phaseIndex]}</span>
        </p>
        <PhaseStepper current={station.phaseIndex} compact />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/70">
          <dt className="text-slate-500">Built</dt>
          <dd className="mt-0.5 text-lg font-bold text-slate-900 tabular-nums">{station.progress}%</dd>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full origin-left rounded-full transition-transform duration-700"
              style={{ background: ringColor(station.progress), transform: `scaleX(${station.progress / 100})` }}
            />
          </div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/70">
          <dt className="flex items-center gap-1 text-slate-500">
            <CalendarClock className="size-3" /> Target opening
          </dt>
          <dd className="mt-0.5 text-lg font-bold text-slate-900">{station.opening}</dd>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/70">
          <dt className="flex items-center gap-1 text-slate-500">
            <Ruler className="size-3" /> From {start.name}
          </dt>
          <dd className="mt-0.5 text-lg font-bold text-slate-900">{stops === 0 ? "Start" : formatDistance(distanceM)}</dd>
          {stops > 0 && <p className="text-[11px] text-slate-500">{stops} stop{stops === 1 ? "" : "s"} along the line</p>}
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/70">
          <dt className="flex items-center gap-1 text-slate-500">
            <Construction className="size-3" /> Roadblocks nearby
          </dt>
          <dd className={cn("mt-0.5 text-lg font-bold tabular-nums", nearby.length ? "text-amber-700" : "text-slate-900")}>{nearby.length}</dd>
          <p className="truncate text-[11px] text-slate-500">{nearby.length ? nearby.join(", ") : `None within ${formatDistance(NEARBY_M)}`}</p>
        </div>
      </dl>
    </div>
  );
}
