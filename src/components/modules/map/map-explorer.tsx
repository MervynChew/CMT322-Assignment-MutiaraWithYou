"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";
import { ArrowDownUp, ArrowLeft, ChevronRight, CircleCheck, MapPin, Route, Search, TrainFront, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AREAS, PLACES, stationByCode } from "@/lib/mock-data";
import { circleBounds, formatDistance, haversine, suggestRoutes } from "@/lib/geo";
import { CLOSURE_TYPES, closureTypeOf, type ClosureTypeId } from "@/lib/closure-type";
import type { LatLng, Place, Roadblock } from "@/lib/types";
import { useMinuteNow } from "@/hooks/use-now";
import { useStableCallback } from "@/hooks/use-stable-callback";
import { ModeFilter, useModeFilteredRoadblocks } from "@/components/shared/travel-modes";
import { useStore } from "@/store/useStore";
import type { MapFocus } from "./base-layers";
import type { MapHighlight } from "./live-map";
import { RoadblockPanel } from "./roadblock-panel";
import { RoutePanel } from "./route-panel";

const LiveMap = dynamic(() => import("./live-map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function MapSkeleton() {
  return (
    <div className="flex size-full items-center justify-center bg-slate-100">
      <Skeleton className="size-full rounded-none" />
      <span className="absolute text-sm text-slate-500">Loading map…</span>
    </div>
  );
}

type Panel = "route" | "roadblock" | null;
type Mode = "search" | "route";

/** The place shown with its radius while searching: a searched place, a followed area or a station. */
type Shown = LatLng & { label: string; sub: string; kind: "area" | "station"; placeId?: string };

const RADIUS_CHOICES = [500, 1000, 2000];
const DEFAULT_RADIUS: Record<Shown["kind"], number> = { area: 1000, station: 500 };

type LinkTarget = { focus: MapFocus | null; shown: Shown | null; roadblockId: string | null };

/** What a link like /map?area=sungai-dua, ?station=S11 or ?roadblock=rb-02 should show. */
function linkTarget(params: { get(name: string): string | null }, roadblocks: Roadblock[], n: number): LinkTarget {
  const key = `link-${n}`;
  const rb = roadblocks.find((r) => r.id === params.get("roadblock"));
  if (rb) return { focus: { kind: "point", at: rb, zoom: 16, key }, shown: null, roadblockId: rb.id };
  const station = stationByCode(params.get("station") ?? "");
  if (station) {
    return {
      focus: { kind: "point", at: station, zoom: 15, key },
      shown: { lat: station.lat, lng: station.lng, label: `${station.code} · ${station.name}`, sub: "Mutiara LRT station", kind: "station" },
      roadblockId: null,
    };
  }
  const area = AREAS.find((a) => a.id === params.get("area"));
  if (area) {
    return {
      focus: { kind: "point", at: area, zoom: 14, key },
      shown: { lat: area.lat, lng: area.lng, label: area.name, sub: "Penang", kind: "area", placeId: area.id },
      roadblockId: null,
    };
  }
  return { focus: null, shown: null, roadblockId: null };
}

/** Unique ids for map focus requests (a new id makes the map move even to the same place). */
let focusSeq = 0;
const nextFocusId = () => ++focusSeq;

const placeSub = (p: Place) => (p.area && p.area !== p.name ? `${p.area}, Penang` : "Penang");

/* ------------------------------------------------------------------ */
/* Place search field (combobox)                                       */
/* ------------------------------------------------------------------ */

function PlaceField({
  value,
  placeholder,
  label,
  exclude = [],
  onPick,
  onClear,
  autoFocus,
  leading,
  className,
}: {
  /** Name of the place currently chosen for this field, if any. */
  value?: string;
  placeholder: string;
  label: string;
  exclude?: (string | undefined)[];
  onPick: (p: Place) => void;
  onClear?: () => void;
  autoFocus?: boolean;
  leading?: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  // While editing, an untouched query (still the chosen name) lists popular places.
  const q = editing && query !== value ? query.trim().toLowerCase() : "";
  const suggestions = useMemo(() => {
    const list = q ? PLACES.filter((p) => p.name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q)) : PLACES.slice(0, 6);
    return list.filter((p) => !exclude.includes(p.id)).slice(0, 6);
  }, [q, exclude]);
  const open = editing && suggestions.length > 0;

  function pick(p: Place) {
    onPick(p);
    setEditing(false);
    setQuery("");
    inputRef.current?.blur();
  }

  const text = editing ? query : (value ?? "");

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 items-center">
        {leading ?? <Search className="size-[18px] text-slate-400" />}
      </span>
      <input
        id={id}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        value={text}
        placeholder={placeholder}
        onFocus={(e) => {
          setEditing(true);
          setQuery(value ?? "");
          setActive(0);
          // Select the chosen name so typing replaces it (the text on screen is unchanged, so the selection stays).
          e.target.select();
        }}
        onBlur={() => setTimeout(() => setEditing(false), 120)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && open) {
            e.preventDefault();
            setActive((a) => (a + 1) % suggestions.length);
          } else if (e.key === "ArrowUp" && open) {
            e.preventDefault();
            setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
            pick(suggestions[active] ?? suggestions[0]);
          } else if (e.key === "Escape") {
            setEditing(false);
            inputRef.current?.blur();
          }
        }}
        className="h-12 w-full rounded-2xl bg-slate-100/80 pr-11 pl-11 text-base text-slate-900 ring-1 ring-transparent transition-[background-color,box-shadow] outline-none placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-blue-500/40"
      />
      {text && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            // While typing: empty the box and keep typing. Otherwise: remove the chosen place.
            if (editing) setQuery("");
            else onClear?.();
          }}
          aria-label={`Clear ${label.toLowerCase()}`}
          className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
        >
          <X className="size-4" />
        </button>
      )}
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute inset-x-0 top-14 z-30 overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-900/10"
        >
          {!q && <li className="px-3 pt-1.5 pb-1 text-xs font-medium text-slate-500">Popular places</li>}
          {suggestions.map((p, i) => (
            <li key={p.id} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(p)}
                className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", i === active && "bg-blue-50")}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <MapPin className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-slate-900">{p.name}</span>
                  <span className="block text-[13px] text-slate-500">{placeSub(p)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StopDot({ letter, tone }: { letter: string; tone: string }) {
  return (
    <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white", tone)}>
      {letter}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Explorer                                                            */
/* ------------------------------------------------------------------ */

export function MapExplorer() {
  const params = useSearchParams();
  const allRoadblocks = useStore((s) => s.roadblocks);
  // Only roadblocks that affect the kinds of traffic the viewer picked (car / motorcycle / walking).
  const roadblocks = useModeFilteredRoadblocks(allRoadblocks);
  const now = useMinuteNow();
  const cardRef = useRef<HTMLElement>(null);

  const [initial] = useState(() => linkTarget(params, allRoadblocks, 0));
  const [mode, setMode] = useState<Mode>(params.get("mode") === "route" ? "route" : "search");
  const [shown, setShown] = useState<Shown | null>(initial.shown);
  const [radiusM, setRadiusM] = useState(initial.shown ? DEFAULT_RADIUS[initial.shown.kind] : 1000);
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [routeStops, setRouteStops] = useState<Place[]>([]);
  const [panel, setPanel] = useState<Panel>(initial.roadblockId ? "roadblock" : null);
  const [selectedRoadblockId, setSelectedRoadblockId] = useState<string | null>(initial.roadblockId);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(initial.focus);

  // The map page stays mounted between visits, so a new link (e.g. another
  // followed area tapped on Home) must move the map here too.
  const linkKey = params.toString();
  const [link, setLink] = useState({ key: linkKey, n: 0 });
  if (link.key !== linkKey) {
    const n = link.n + 1;
    const t = linkTarget(params, allRoadblocks, n);
    setLink({ key: linkKey, n });
    setFocus(t.focus);
    if (t.shown) {
      setMode("search");
      setShown(t.shown);
      setRadiusM(DEFAULT_RADIUS[t.shown.kind]);
      if (panel === "roadblock") setPanel(null);
    } else if (params.get("mode") === "route") {
      setMode("route");
    }
    if (t.roadblockId) {
      setSelectedRoadblockId(t.roadblockId);
      setPanel("roadblock");
    }
  }

  /** Keeps the floating card from covering what the map zooms to (beside it on wide screens, above it on phones). */
  function cardPadding(): [number, number] {
    const card = cardRef.current?.getBoundingClientRect();
    if (!card) return [40, 110];
    return window.innerWidth >= 640 ? [card.right + 24, 90] : [24, card.bottom + 24];
  }

  function fitCircle(center: LatLng, r: number, key: string) {
    setFocus({ kind: "bounds", points: circleBounds(center, r), key, padTopLeft: cardPadding() });
  }

  const nearby = useMemo(() => {
    if (!shown) return [];
    return roadblocks
      .filter((r) => r.status !== "completed")
      .map((r) => ({ rb: r, d: haversine(r, shown) }))
      .filter((x) => x.d <= radiusM)
      .sort((a, b) => a.d - b.d);
  }, [roadblocks, shown, radiusM]);

  const routes = useMemo(() => suggestRoutes(routeStops, roadblocks), [routeStops, roadblocks]);
  const selectedRoadblock = allRoadblocks.find((r) => r.id === selectedRoadblockId) ?? null;

  /* ---------- Search mode ---------- */

  function showPlace(p: Place) {
    const next: Shown = { lat: p.lat, lng: p.lng, label: p.name, sub: placeSub(p), kind: "area", placeId: p.id };
    setShown(next);
    if (panel === "roadblock") setPanel(null);
    fitCircle(next, radiusM, `place-${p.id}-${nextFocusId()}`);
  }

  function changeRadius(r: number) {
    setRadiusM(r);
    if (shown) fitCircle(shown, r, `radius-${r}-${nextFocusId()}`);
  }

  /* ---------- Route mode ---------- */

  function startRoute() {
    const start =
      shown && (PLACES.find((p) => p.id === shown.placeId) ?? { id: `here-${shown.label}`, name: shown.label, area: shown.sub, lat: shown.lat, lng: shown.lng });
    setFrom(start ?? null);
    setTo(null);
    setRouteStops([]);
    setMode("route");
    if (panel === "roadblock") setPanel(null);
  }

  function exitRoute() {
    setMode("search");
    setFrom(null);
    setTo(null);
    setRouteStops([]);
    if (panel === "route") setPanel(null);
    if (shown) fitCircle(shown, radiusM, `back-${nextFocusId()}`);
  }

  function setStop(which: "from" | "to", p: Place | null) {
    const nextFrom = which === "from" ? p : from;
    const nextTo = which === "to" ? p : to;
    setFrom(nextFrom);
    setTo(nextTo);
    // A changed trip needs checking again.
    setRouteStops([]);
    if (panel === "route") setPanel(null);
    if (nextFrom && nextTo) setFocus({ kind: "bounds", points: [nextFrom, nextTo], key: `trip-${nextFrom.id}-${nextTo.id}`, padTopLeft: cardPadding() });
    else if (p) setFocus({ kind: "point", at: p, zoom: 15, key: `stop-${which}-${p.id}-${nextFocusId()}` });
  }

  function swap() {
    setFrom(to);
    setTo(from);
    setRouteStops([]);
    if (panel === "route") setPanel(null);
  }

  function checkRoute() {
    if (!from || !to) return;
    const stops = [from, to];
    setRouteStops(stops);
    const r = suggestRoutes(stops, roadblocks);
    setSelectedRouteId(r[0]?.id ?? null);
    setSelectedRoadblockId(null);
    setPanel("route");
    setFocus({ kind: "bounds", points: r.flatMap((x) => x.path), key: `route-${nextFocusId()}`, padTopLeft: cardPadding() });
  }

  /* ---------- Map callbacks ---------- */

  const openRoadblock = useStableCallback((id: string) => {
    const rb = allRoadblocks.find((r) => r.id === id);
    if (!rb) return;
    setSelectedRoadblockId(id);
    setPanel("roadblock");
    setFocus({ kind: "point", at: rb, zoom: 16, key: `rb-${id}-${nextFocusId()}` });
  });

  const selectRoute = useStableCallback((id: string) => {
    setSelectedRouteId(id);
    const r = routes.find((x) => x.id === id);
    if (r) setFocus({ kind: "bounds", points: r.path, key: `sel-${id}-${nextFocusId()}`, padTopLeft: cardPadding() });
  });
  const clickRoute = useStableCallback((id: string) => {
    setPanel("route");
    selectRoute(id);
  });

  const mapStops = useMemo(() => (mode === "route" ? [from, to].filter((p): p is Place => p !== null) : []), [mode, from, to]);
  const highlight = useMemo<MapHighlight | null>(
    () => (mode === "search" && shown ? { lat: shown.lat, lng: shown.lng, label: shown.label, kind: shown.kind, radiusM } : null),
    [mode, shown, radiusM],
  );

  return (
    <div className="mu-map-full relative h-dvh w-full overflow-hidden">
      <LiveMap
        roadblocks={roadblocks}
        stops={mapStops}
        routes={routes}
        selectedRouteId={selectedRouteId}
        selectedRoadblockId={panel === "roadblock" ? selectedRoadblockId : null}
        focus={focus}
        highlight={highlight}
        panelOpen={panel !== null}
        now={now}
        onRoadblockClick={openRoadblock}
        onRouteClick={clickRoute}
      />

      {/* Search & route planner: full width on phones, a floating card from small tablets up */}
      <section
        ref={cardRef}
        aria-label={mode === "search" ? "Search the map" : "Plan a route"}
        className="absolute inset-x-3 top-20 z-[800] rounded-[28px] bg-white/95 p-2.5 shadow-[0_16px_40px_-14px_rgb(15_23_42/0.4)] ring-1 ring-slate-900/5 sm:right-auto sm:w-[23rem] sm:p-3 lg:w-[25rem]"
      >
        {mode === "search" ? (
          <>
            <div className="flex items-center gap-2">
              <PlaceField
                className="min-w-0 flex-1"
                label="Search for a place"
                placeholder="Search a place, e.g. Sungai Dua"
                value={shown?.label}
                exclude={[shown?.placeId]}
                onPick={showPlace}
                onClear={() => setShown(null)}
              />
              <Button
                onClick={startRoute}
                className="h-12 shrink-0 rounded-2xl bg-blue-700 px-3.5 text-[15px] shadow-md shadow-blue-800/25 hover:bg-blue-800"
                aria-label={shown ? `Plan a route from ${shown.label}` : "Plan a route"}
                title="Plan a route"
              >
                <Route className="size-[18px]" /> Route
              </Button>
            </div>

            {shown ? (
              <div className="animate-rise-in mt-2.5 rounded-[22px] bg-sky-50/80 p-3 ring-1 ring-sky-100">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-sm">
                    {shown.kind === "station" ? <TrainFront className="size-5" /> : <MapPin className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base leading-tight font-semibold text-slate-900">{shown.label}</p>
                    <p className="text-[13px] text-slate-500">{shown.sub}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShown(null)}
                    aria-label={`Stop showing ${shown.label}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span id="radius-label" className="text-sm font-medium text-slate-700">
                    Area around it
                  </span>
                  <div role="radiogroup" aria-labelledby="radius-label" className="flex rounded-full bg-white p-0.5 ring-1 ring-sky-100">
                    {RADIUS_CHOICES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={radiusM === r}
                        onClick={() => changeRadius(r)}
                        className={cn(
                          "rounded-full px-3 py-1 text-sm font-medium transition-[background-color,color] duration-200",
                          radiusM === r ? "bg-sky-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900",
                        )}
                      >
                        {formatDistance(r)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 border-t border-sky-100 pt-2.5">
                  {nearby.length === 0 ? (
                    <p className="flex items-center gap-2 text-sm text-emerald-700">
                      <CircleCheck className="size-4 shrink-0" /> No roadblocks within {formatDistance(radiusM)}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-800">
                        {nearby.length} roadblock{nearby.length === 1 ? "" : "s"} within {formatDistance(radiusM)}
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {nearby.slice(0, 3).map(({ rb, d }) => {
                          const t: ClosureTypeId = closureTypeOf(rb);
                          return (
                            <li key={rb.id}>
                              <button
                                type="button"
                                onClick={() => openRoadblock(rb.id)}
                                className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white"
                              >
                                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: CLOSURE_TYPES[t].color }} />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium text-slate-900">{rb.road}</span>
                                  <span className="block text-xs text-slate-500">
                                    {CLOSURE_TYPES[t].label} · {formatDistance(d)} away
                                  </span>
                                </span>
                                <ChevronRight className="size-4 shrink-0 text-slate-400" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      {nearby.length > 3 && <p className="mt-1 px-2 text-xs text-slate-500">+{nearby.length - 3} more inside the circle on the map</p>}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-2 px-2 text-[13px] leading-snug text-slate-500">
                Search a place to see the roadblocks around it, or tap <b className="font-semibold text-slate-700">Route</b> to check a trip.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={exitRoute} aria-label="Back to search">
                <ArrowLeft />
              </Button>
              <p className="text-base font-semibold text-slate-900">Plan a route</p>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative min-w-0 flex-1 space-y-2">
                {/* Dotted line joining the start and destination markers */}
                <span aria-hidden className="pointer-events-none absolute top-9 bottom-9 left-[1.55rem] z-10 border-l-2 border-dotted border-slate-300" />
                <PlaceField
                  label="Start"
                  placeholder="Choose a start"
                  value={from?.name}
                  exclude={[to?.id]}
                  autoFocus={!from}
                  leading={<StopDot letter="A" tone="bg-blue-700" />}
                  onPick={(p) => setStop("from", p)}
                  onClear={() => setStop("from", null)}
                />
                <PlaceField
                  label="Destination"
                  placeholder="Choose a destination"
                  value={to?.name}
                  exclude={[from?.id]}
                  autoFocus={!!from && !to}
                  leading={<StopDot letter="B" tone="bg-slate-900" />}
                  onPick={(p) => setStop("to", p)}
                  onClear={() => setStop("to", null)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-10 shrink-0 rounded-full text-slate-600"
                onClick={swap}
                disabled={!from && !to}
                aria-label="Swap start and destination"
                title="Swap start and destination"
              >
                <ArrowDownUp />
              </Button>
            </div>

            <Button
              className="mt-3 h-11 w-full rounded-full bg-blue-700 text-[15px] shadow-md shadow-blue-800/25 hover:bg-blue-800"
              disabled={!from || !to}
              onClick={checkRoute}
            >
              <Route /> {routeStops.length ? "Check again" : "Check my route"}
            </Button>
            {(!from || !to) && (
              <p className="mt-2 px-2 text-center text-[13px] text-slate-500">{!from ? "Choose where you're starting from." : "Now choose where you're going."}</p>
            )}
          </>
        )}

        <div className="mt-3 rounded-[22px] bg-slate-50 p-2.5 ring-1 ring-slate-100">
          <div className="mb-2 px-1">
            <p className="text-sm font-semibold text-slate-800">How are you travelling?</p>
            <p className="text-xs text-slate-500 max-sm:hidden">We only show roadblocks that affect your choice.</p>
          </div>
          <ModeFilter tiles />
        </div>
      </section>

      {/* Legend */}
      <div className="absolute bottom-3 left-14 z-[800] hidden max-w-[calc(100%-5rem)] space-y-1 rounded-2xl bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-lg ring-1 ring-slate-900/5 md:block">
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Roadblock pins">
          {(Object.keys(CLOSURE_TYPES) as ClosureTypeId[]).map((id) => (
            <li key={id} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full ring-2 ring-white" style={{ background: CLOSURE_TYPES[id].color }} />
              {CLOSURE_TYPES[id].label}
            </li>
          ))}
          <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-rose-600 ring-2 ring-rose-200" /> Overdue</li>
        </ul>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Lines on the map">
          <li className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full bg-red-600" /> Road fully blocked</li>
          <li className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full bg-[repeating-linear-gradient(90deg,#f59e0b_0_6px,transparent_6px_9px)]" /> Lane blocked</li>
          <li className="flex items-center gap-1.5"><span className="h-1 w-5 rounded-full bg-blue-800" /> Mutiara LRT</li>
          {highlight && <li className="flex items-center gap-1.5"><span className="size-3 rounded-full border-2 border-dashed border-sky-600 bg-sky-100" /> Area around {highlight.label}</li>}
        </ul>
      </div>

      <RoutePanel
        open={panel === "route"}
        onClose={() => setPanel(null)}
        stops={routeStops}
        routes={routes}
        selectedRouteId={selectedRouteId}
        onSelectRoute={selectRoute}
        onSelectObstacle={openRoadblock}
      />
      <RoadblockPanel
        open={panel === "roadblock"}
        roadblock={selectedRoadblock}
        now={now}
        onClose={() => setPanel(routeStops.length >= 2 && routes.length ? "route" : null)}
      />
    </div>
  );
}
