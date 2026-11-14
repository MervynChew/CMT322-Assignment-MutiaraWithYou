"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useReducer, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Eye,
  EyeOff,
  Layers,
  LoaderCircle,
  Maximize2,
  Minimize2,
  MousePointer2,
  Navigation,
  ReceiptText,
  Spline,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AREAS } from "@/lib/mock-data";
import { formatDistance, haversine, segmentReach } from "@/lib/geo";
import { CLOSURE_TYPES, syncClosure, type ClosureTypeId } from "@/lib/closure-type";
import {
  compactPath,
  dominantRoad,
  MAX_SEGMENT_M,
  RoadSnapError,
  snapToRoad,
  traceAlongRoad,
} from "@/lib/road-snap";
import type { ClosureSegment, ClosureType, LatLng, PendingChange, Roadblock, TravelMode } from "@/lib/types";
import { useMinuteNow } from "@/hooks/use-now";
import { applyPending, newRoadblockId, newSegmentId, useStore } from "@/store/useStore";
import type { MapFocus } from "@/components/modules/map/base-layers";
import type { DrawPreview, EditorLayers, RejectFlash } from "./editor-map";
import { AuditReceipt } from "./audit-receipt";
import { AnnouncementQueue } from "./announcement-queue";
import { blankRoadblock, CLOSURE_PRESETS, RADIUS_MAX, type ClosurePreset } from "./closure-presets";

/** Snapping to a road may land a few metres past the circle; allow that much. */
const ZONE_TOLERANCE_M = 12;

/** Two opposite corners of the square around a roadblock's blocked zone (for fitting the map to it). */
function zoneCorners(rb: Roadblock): LatLng[] {
  const dLat = rb.radiusM / 110_540;
  const dLng = rb.radiusM / (111_320 * Math.cos((rb.lat * Math.PI) / 180));
  return [
    { lat: rb.lat + dLat, lng: rb.lng + dLng },
    { lat: rb.lat - dLat, lng: rb.lng - dLng },
  ];
}
import { RoadblockInspector } from "./roadblock-inspector";
import { ModePicker, modesLabel } from "@/components/shared/travel-modes";

const EditorMap = dynamic(() => import("./editor-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

type Tool = "select" | ClosurePreset["id"];

/** Drawing state: the preview, what is needed to undo a point, and who the new stretch blocks. */
type Drawing = DrawPreview & { legs: LatLng[][]; legLengths: number[]; roads: string[]; modes: TravelMode[] };

const DRAW_KINDS: { kind: ClosureType; label: string; hint: string; swatch: string }[] = [
  { kind: "full", label: "Full block", hint: "Trace a fully closed stretch", swatch: "bg-red-600" },
  { kind: "partial", label: "Partial block", hint: "Trace a lane closure", swatch: "bg-amber-500" },
];

export function MapEditor() {
  const roadblocks = useStore((s) => s.roadblocks);
  const pending = useStore((s) => s.pendingChanges);
  const queueChange = useStore((s) => s.queueChange);
  const now = useMinuteNow();
  const draftMap = useMemo(() => applyPending(roadblocks, pending), [roadblocks, pending]);

  const [enlarged, setEnlarged] = useState(false);
  const [tool, setTool] = useState<Tool>("select");
  const [layers, setLayers] = useState<EditorLayers>({ line: true, stations: true, completed: false });
  const [draft, setDraft] = useState<Roadblock | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [showReceipt, setShowReceipt] = useState(true);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [reject, setReject] = useState<RejectFlash | null>(null);
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  const preset = CLOSURE_PRESETS.find((p) => p.id === tool);
  const queuedForRemoval = !!draft && pending.some((c) => c.kind === "remove" && c.roadblock.id === draft.id);
  const canDraw = !!draft && !queuedForRemoval;

  // The pin being edited is drawn from the inspector draft, so moving it or
  // drawing segments shows immediately and Cancel puts everything back.
  const canvasPins = useMemo(() => {
    if (!draft || queuedForRemoval) return draftMap;
    return draftMap.some((r) => r.id === draft.id)
      ? draftMap.map((r) => (r.id === draft.id ? draft : r))
      : [...draftMap, draft];
  }, [draftMap, draft, queuedForRemoval]);

  // Clear the "not on a road" marker shortly after it appears.
  useEffect(() => {
    if (!reject) return;
    const t = setTimeout(() => setReject(null), 1600);
    return () => clearTimeout(t);
  }, [reject]);

  // Keyboard: Enter finishes a drawing, Backspace undoes a point, Esc steps back out.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]");
      if (drawing && !typing) {
        if (e.key === "Enter") {
          e.preventDefault();
          finishDraw();
          return;
        }
        if (e.key === "Backspace" || (e.key === "z" && (e.ctrlKey || e.metaKey))) {
          e.preventDefault();
          undoPoint();
          return;
        }
      }
      if (e.key !== "Escape") return;
      if (drawing) setDrawing(null);
      else if (tool !== "select") setTool("select");
      else if (enlarged && !draft) setEnlarged(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Lock page scroll while the canvas is full screen.
  useEffect(() => {
    if (!enlarged) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [enlarged]);

  function flyTo(at: LatLng, zoom = 17) {
    setFocus({ kind: "point", at, zoom, key: `${at.lat},${at.lng},${Date.now()}` });
  }

  function handleMapClick(at: LatLng) {
    if (drawing) {
      void addDrawPoint(at);
      return;
    }
    if (!preset) return;
    const base = blankRoadblock(newRoadblockId(), at, new Date());
    setIsNew(true);
    setDraft(preset.apply(base, new Date()));
    setTool("select");
  }

  function openRoadblock(rb: Roadblock, fresh: boolean) {
    setIsNew(fresh);
    setDraft(rb);
    setDrawing(null);
  }

  function closeInspector() {
    setDraft(null);
    setDrawing(null);
  }

  function handleSelect(id: string) {
    if (draft?.id === id) return;
    const rb = draftMap.find((r) => r.id === id) ?? pending.find((c) => c.roadblock.id === id)?.roadblock;
    if (rb) openRoadblock(rb, !roadblocks.some((r) => r.id === id));
  }

  /** Receipt line clicked → highlight that roadblock (and its drawn segments) on the canvas. */
  function handleReceiptSelect(change: PendingChange) {
    const rb = change.kind === "remove" ? change.roadblock : (draftMap.find((r) => r.id === change.roadblock.id) ?? change.roadblock);
    openRoadblock(rb, change.kind === "add");
    const segPoints = rb.segments?.flatMap((s) => s.path) ?? [];
    if (segPoints.length) setFocus({ kind: "bounds", points: [rb, ...segPoints], key: `rcpt-${rb.id}-${Date.now()}` });
    else flyTo(rb);
  }

  /**
   * Moving a pin keeps its drawn stretches inside its blocked zone: the radius
   * grows to cover them, and a move that would need more than the limit is undone.
   */
  function movedWithinZone(rb: Roadblock, at: LatLng): Roadblock | null {
    const reach = segmentReach(at, rb.segments);
    if (reach <= rb.radiusM) return { ...rb, ...at };
    const radiusM = Math.ceil(reach / 10) * 10;
    if (radiusM > RADIUS_MAX) {
      toast.error("Pin is too far from its drawn stretches", {
        description: `They'd be ${formatDistance(reach)} away, beyond the ${formatDistance(RADIUS_MAX)} limit. Move the pin closer to them.`,
      });
      return null;
    }
    toast(`Blocked zone widened to ${formatDistance(radiusM)}`, { description: "So the drawn stretches stay inside it." });
    return { ...rb, ...at, radiusM };
  }

  function handleMove(id: string, at: LatLng) {
    // The pin open in the inspector belongs to that edit; it's saved with "Add to receipt" / "Queue changes".
    if (draft?.id === id) {
      const next = movedWithinZone(draft, at);
      // A refused move re-renders the pin at its old position.
      setDraft(next ?? { ...draft });
      return;
    }
    const rb = draftMap.find((r) => r.id === id);
    if (!rb) return;
    const next = movedWithinZone(rb, at);
    if (!next) {
      // Re-render so the dragged pin snaps back to where it was.
      forceRender();
      return;
    }
    queueChange({ kind: roadblocks.some((r) => r.id === id) ? "edit" : "add", roadblock: next });
    toast(`Moved ${rb.road || "pin"}`, { description: "Queued in the audit trail." });
  }

  /**
   * Full screen is for placing and drawing. Posting happens on the full receipt,
   * next to the announcement form (every post needs an announcement).
   */
  function reviewReceipt() {
    setDrawing(null);
    setEnlarged(false);
    // Wait for the page to return to its normal layout, then bring the receipt into view.
    setTimeout(() => {
      document.getElementById("post-receipt")?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (!useStore.getState().pendingAnnouncements.length) {
        toast("Add an announcement before posting", { description: "Every post needs one so the public knows what changed." });
      }
    }, 350);
  }

  /* ---------- Drawing closure segments ---------- */

  function startDraw(kind: ClosureType) {
    if (!canDraw) {
      toast("Place or open a roadblock first", { description: "Segments are drawn for the roadblock open in the inspector." });
      return;
    }
    setTool("select");
    setDrawing({ kind, points: [], path: [], busy: false, legs: [], legLengths: [], roads: [], modes: draft?.modes ?? ["car", "motorcycle"] });
    // Zoom so the whole blocked zone is in view: that's where the drawing has to go.
    if (draft) setFocus({ kind: "bounds", points: zoneCorners(draft), key: `zone-${draft.id}-${Date.now()}` });
  }

  function rejectAt(at: LatLng, message: string) {
    setReject({ at, key: Date.now() });
    toast.error(message);
  }

  /** Refuses a point outside the roadblock's blocked zone, offering to widen the zone when that's possible. */
  function rejectOutside(at: LatLng, distance: number, what = "That point") {
    setReject({ at, key: Date.now() });
    const needed = Math.ceil((distance + 15) / 10) * 10;
    if (needed > RADIUS_MAX) {
      toast.error(`${what} is outside this roadblock's blocked zone`, {
        description: `It's ${formatDistance(distance)} from the pin, beyond the ${formatDistance(RADIUS_MAX)} limit. Draw closer to the pin, or add a separate roadblock there.`,
      });
      return;
    }
    toast.error(`${what} is outside this roadblock's blocked zone`, {
      description: `Draw inside the blue circle (${formatDistance(draft?.radiusM ?? 0)}), or make the radius bigger first.`,
      action: { label: `Make it ${formatDistance(needed)}`, onClick: () => setDraft((d) => d && { ...d, radiusM: needed }) },
    });
  }

  async function addDrawPoint(at: LatLng) {
    if (!drawing || drawing.busy || !draft) return;
    // Every drawing belongs to its roadblock: it must stay inside the roadblock's radius.
    const radius = draft.radiusM;
    const clickDist = haversine(at, draft);
    if (clickDist > radius) {
      rejectOutside(at, clickDist);
      return;
    }
    const current = drawing;
    setDrawing({ ...current, busy: true });
    try {
      const snap = await snapToRoad(at);
      // Snapping can pull the point onto a road just outside the circle.
      const snapDist = haversine(snap.point, draft);
      if (snapDist > radius + ZONE_TOLERANCE_M) {
        setDrawing((d) => d && { ...d, busy: false });
        rejectOutside(snap.point, snapDist, "The nearest road");
        return;
      }
      const last = current.points[current.points.length - 1];
      if (!last) {
        setDrawing((d) => d && { ...d, busy: false, points: [snap.point], path: [snap.point], roads: snap.road ? [snap.road] : [] });
        return;
      }
      if (haversine(last, snap.point) < 6) {
        setDrawing((d) => d && { ...d, busy: false });
        return;
      }
      // Alternatives let a click that snapped across a divider join the previous point on its own carriageway.
      const leg = await traceAlongRoad(last, snap.point, snap.alternatives.filter((p) => haversine(p, draft) <= radius + ZONE_TOLERANCE_M));
      // The road between the two points may bend out of the zone even when both ends are inside.
      const legReach = segmentReach(draft, [leg]);
      if (legReach > radius + ZONE_TOLERANCE_M) {
        setDrawing((d) => d && { ...d, busy: false });
        rejectOutside(at, legReach, "The road between those points");
        return;
      }
      const total = current.legLengths.reduce((a, b) => a + b, 0) + leg.lengthM;
      if (total > MAX_SEGMENT_M) {
        throw new RoadSnapError("too-long", `One segment can cover at most ${formatDistance(MAX_SEGMENT_M)}. Finish this one and draw another.`);
      }
      setDrawing((d) => {
        if (!d) return d;
        const legs = [...d.legs, leg.path];
        return {
          ...d,
          busy: false,
          points: [...d.points, leg.end],
          legs,
          legLengths: [...d.legLengths, leg.lengthM],
          roads: [...d.roads, ...leg.roads],
          path: [d.points[0], ...legs.flat()],
        };
      });
    } catch (e) {
      setDrawing((d) => d && { ...d, busy: false });
      rejectAt(at, e instanceof Error ? e.message : "Couldn't snap that point to a road.");
    }
  }

  function undoPoint() {
    setDrawing((d) => {
      if (!d || d.busy || !d.points.length) return d;
      const points = d.points.slice(0, -1);
      const legs = d.legs.slice(0, -1);
      return { ...d, points, legs, legLengths: d.legLengths.slice(0, -1), path: points.length ? [points[0], ...legs.flat()] : [] };
    });
  }

  function finishDraw() {
    if (!drawing || drawing.busy || !draft) return;
    if (drawing.points.length < 2) {
      toast("Click at least two points along the road", { description: "The line follows the road between your points." });
      return;
    }
    const segment: ClosureSegment = {
      id: newSegmentId(),
      kind: drawing.kind,
      road: dominantRoad(drawing.roads),
      path: compactPath(drawing.path),
      lengthM: Math.round(drawing.legLengths.reduce((a, b) => a + b, 0)),
      modes: drawing.modes,
    };
    // A full stretch closes the road all day, so it ends any daily hours (see syncClosure).
    const endsHours = segment.kind === "full" && !!draft.dailyWindow;
    changeDraft((d) => ({ ...d, road: d.road || segment.road, segments: [...(d.segments ?? []), segment] }));
    setDrawing(null);
    toast.success(`${segment.kind === "full" ? "Full" : "Partial"} block drawn on ${segment.road}`, {
      description: endsHours
        ? `${formatDistance(segment.lengthM)}. A full block closes the road all day, so this is now a full closure without daily hours.`
        : `${formatDistance(segment.lengthM)} · blocks ${modesLabel(drawing.modes).toLowerCase()}. Save the roadblock to add it to the receipt.`,
    });
  }

  /** Every change to the open roadblock's closure goes through here, so its type stays consistent (see syncClosure). */
  function changeDraft(fn: (d: Roadblock) => Roadblock) {
    setDraft((d) => d && syncClosure(d, fn(d)));
  }

  function updateSegments(fn: (segs: ClosureSegment[]) => ClosureSegment[]) {
    changeDraft((d) => ({ ...d, segments: fn(d.segments ?? []) }));
  }

  /* ---------- Rendering ---------- */

  const inspectorOpen = draft !== null;
  const drawLength = drawing ? drawing.legLengths.reduce((a, b) => a + b, 0) : 0;

  const toolButton = (t: { id: Tool; label: string; hint: string; icon: typeof MousePointer2; swatch: string }) => {
    const active = tool === t.id && !drawing;
    return (
      <Tooltip key={t.id}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => {
              setDrawing(null);
              setTool(active && t.id !== "select" ? "select" : t.id);
            }}
            aria-pressed={active}
            aria-label={enlarged ? undefined : t.label}
            className={cn(
              "flex items-center gap-2.5 rounded-xl text-left text-sm transition",
              enlarged ? "w-full px-2 py-1.5" : "p-1",
              active ? "bg-blue-600 text-white shadow-md" : "text-slate-700 hover:bg-slate-100",
            )}
          >
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-white", active ? "bg-white/20" : t.swatch)}>
              <t.icon className="size-4" />
            </span>
            {enlarged && (
              <span className="min-w-0">
                <span className="block leading-tight font-medium">{t.label}</span>
                <span className={cn("block text-xs", active ? "text-blue-100" : "text-slate-500")}>{t.hint}</span>
              </span>
            )}
          </button>
        </TooltipTrigger>
        {!enlarged && (
          <TooltipContent side="bottom">
            {t.label} · {t.hint}
          </TooltipContent>
        )}
      </Tooltip>
    );
  };

  const drawButton = (d: (typeof DRAW_KINDS)[number]) => {
    const active = drawing?.kind === d.kind;
    return (
      <Tooltip key={d.kind}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => (active ? setDrawing(null) : startDraw(d.kind))}
            aria-pressed={active}
            aria-label={`Draw ${d.label.toLowerCase()}`}
            className={cn(
              "flex items-center gap-2.5 rounded-xl text-left text-sm transition",
              enlarged ? "w-full px-2 py-1.5" : "p-1",
              active ? "bg-slate-900 text-white shadow-md" : "text-slate-700 hover:bg-slate-100",
              !canDraw && "opacity-45",
            )}
          >
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-white", d.swatch)}>
              <Spline className="size-4" />
            </span>
            {enlarged && (
              <span className="min-w-0">
                <span className="block leading-tight font-medium">Draw {d.label.toLowerCase()}</span>
                <span className={cn("block text-xs", active ? "text-slate-300" : "text-slate-500")}>
                  {canDraw ? d.hint : "Open a roadblock first"}
                </span>
              </span>
            )}
          </button>
        </TooltipTrigger>
        {!enlarged && (
          <TooltipContent side="bottom">
            Draw {d.label.toLowerCase()} · {canDraw ? "snaps to roads" : "open a roadblock first"}
          </TooltipContent>
        )}
      </Tooltip>
    );
  };

  const tools = [
    { id: "select" as const, label: "Select & move", hint: "Click pins to edit, drag to move", icon: MousePointer2, swatch: "bg-slate-700" },
    ...CLOSURE_PRESETS,
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      {/* ---------- Canvas ---------- */}
      <div
        className={cn(
          "overflow-hidden bg-slate-200",
          enlarged
            ? "mu-map-full fixed inset-0 z-40"
            : "relative isolate h-[620px] rounded-3xl shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]",
        )}
      >
        <EditorMap
          roadblocks={canvasPins}
          pending={pending}
          placing={!!preset}
          selectedId={draft?.id ?? null}
          focus={focus}
          layers={layers}
          sizeToken={enlarged}
          padRight={inspectorOpen || (enlarged && showReceipt) ? 380 : 0}
          now={now}
          drawing={drawing}
          reject={reject}
          onMapClick={handleMapClick}
          onSelect={(id) => {
            if (preset || drawing) return;
            handleSelect(id);
          }}
          onMove={handleMove}
          onFinishDraw={finishDraw}
        />

        {/* Tool palette */}
        <div
          className={cn(
            "absolute z-[500] rounded-2xl border border-white/70 bg-white/95 p-1.5 shadow-xl",
            enlarged
              ? "top-20 left-3 flex max-h-[calc(100%-6.5rem)] w-60 flex-col gap-1 overflow-y-auto max-md:hidden"
              : "top-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1",
            !enlarged && inspectorOpen && "max-md:hidden",
          )}
        >
          {enlarged && <p className="px-2 pt-1 pb-0.5 text-xs font-semibold tracking-wider text-slate-400 uppercase">Place a roadblock</p>}
          {tools.map(toolButton)}
          {enlarged ? (
            <p className="mt-1 border-t border-slate-100 px-2 pt-2 pb-0.5 text-xs font-semibold tracking-wider text-slate-400 uppercase">Draw on road</p>
          ) : (
            <span aria-hidden className="mx-0.5 w-px self-stretch bg-slate-200" />
          )}
          {DRAW_KINDS.map(drawButton)}

          {enlarged && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <p className="flex items-center gap-1 px-2 pt-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                <Layers className="size-3" /> Layers
              </p>
              {(
                [
                  ["line", "Mutiara LRT line"],
                  ["stations", "LRT stations"],
                  ["completed", "Completed closures"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                >
                  {layers[key] ? <Eye className="size-4 text-blue-600" /> : <EyeOff className="size-4 text-slate-400" />}
                  {label}
                </button>
              ))}
              <div className="my-1 border-t border-slate-100" />
              <p className="flex items-center gap-1 px-2 pt-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                <Navigation className="size-3" /> Jump to area
              </p>
              <div className="px-1 pb-1">
                <Select
                  onValueChange={(v) => {
                    const a = AREAS.find((x) => x.id === v);
                    if (a) flyTo(a, 15);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-xl data-[size=default]:h-9">
                    <SelectValue placeholder="Choose area…" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[1300]">
                    {AREAS.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="my-1 border-t border-slate-100" />
              <ul className="space-y-1 px-2 pb-1 text-xs text-slate-500">
                <li className="flex items-center gap-2"><span className="h-1.5 w-5 rounded-full bg-red-600" /> Full block (drawn)</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-5 rounded-full bg-[repeating-linear-gradient(90deg,#f59e0b_0_6px,transparent_6px_9px)]" /> Partial block (drawn)</li>
                {(Object.keys(CLOSURE_TYPES) as ClosureTypeId[]).map((id) => (
                  <li key={id} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: CLOSURE_TYPES[id].color }} /> {CLOSURE_TYPES[id].label} pin
                  </li>
                ))}
                <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-rose-600" /> Overdue</li>
                <li className="flex items-center gap-2"><span className="rounded bg-blue-700 px-1 text-[10px] font-bold text-white">NEW</span> Queued change</li>
              </ul>
            </>
          )}
        </div>

        {/* Placement hint */}
        {preset && !drawing && (
          <div className={cn("pointer-events-none absolute inset-x-3 z-[500] flex justify-center", enlarged ? "top-20" : "top-16")}>
            <p className="rounded-full bg-slate-900/90 px-4 py-2 text-center text-sm text-white shadow-xl">
              Click the map to place a <b>{preset.label.toLowerCase()}</b> · Esc to cancel
            </p>
          </div>
        )}

        {/* Drawing toolbar */}
        {drawing && (
          <div
            className={cn(
              "absolute inset-x-3 z-[650] flex justify-center",
              enlarged ? "top-20 md:left-[16rem]" : "top-3",
              inspectorOpen && "md:right-[370px]",
            )}
          >
            <div className="w-full max-w-xl rounded-2xl bg-slate-900/95 p-2 text-white shadow-2xl ring-1 ring-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", drawing.kind === "full" ? "bg-red-600" : "bg-amber-500")}>
                  {drawing.busy ? <LoaderCircle className="size-4 animate-spin" /> : <Spline className="size-4" />}
                </span>
                <div className="min-w-0 flex-1 text-sm leading-tight">
                  <p className="font-semibold">
                    Drawing {drawing.kind === "full" ? "full" : "partial"} block
                    <span className="ml-1.5 font-normal text-slate-400">
                      {drawing.points.length} point{drawing.points.length === 1 ? "" : "s"}
                      {drawLength > 0 && ` · ${formatDistance(drawLength)}`}
                    </span>
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {drawing.busy
                      ? "Snapping to the road…"
                      : drawing.points.length === 0
                        ? `Click a road inside the blue circle (${formatDistance(draft?.radiusM ?? 0)}) where the closure starts`
                        : drawing.points.length === 1
                          ? "Click further along the road; the line follows the street"
                          : `${dominantRoad(drawing.roads)} · Enter or click the last point to finish`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 rounded-full text-slate-200 hover:bg-white/10 hover:text-white" disabled={!drawing.points.length || drawing.busy} onClick={undoPoint}>
                    <Undo2 /> Undo
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 rounded-full text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => setDrawing(null)}>
                    <X /> Cancel
                  </Button>
                  <Button size="sm" className="h-8 rounded-full bg-blue-600 hover:bg-blue-500" disabled={drawing.points.length < 2 || drawing.busy} onClick={finishDraw}>
                    <Check /> Finish
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2">
                <span className="shrink-0 pl-1 text-xs font-semibold text-slate-300">This stretch blocks</span>
                <ModePicker
                  dark
                  label="Who this stretch blocks"
                  value={drawing.modes}
                  onChange={(modes) => setDrawing((d) => d && { ...d, modes })}
                  className="flex-1 [&>button]:flex-row [&>button]:justify-center [&>button]:py-1.5"
                />
              </div>
            </div>
          </div>
        )}

        {/* Top-right actions */}
        {!drawing && (
          <div className={cn("absolute z-[500] flex gap-2", enlarged ? "top-20" : "top-3", inspectorOpen && !enlarged ? "right-[370px] max-md:hidden" : "right-3")}>
            {enlarged && !inspectorOpen && (
              <Button variant="outline" onClick={() => setShowReceipt((v) => !v)} className="h-10 rounded-full bg-white/95 shadow-lg">
                <ReceiptText /> <span className="max-sm:hidden">{showReceipt ? "Hide receipt" : "Show receipt"}</span>
                {pending.length > 0 && <span className="rounded-full bg-amber-400 px-1.5 text-xs text-white">{pending.length}</span>}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setEnlarged((v) => !v)}
              aria-label={enlarged ? "Exit full screen" : "Enlarge map"}
              className="h-10 rounded-full bg-white/95 shadow-lg"
            >
              {enlarged ? <Minimize2 /> : <Maximize2 />}
              <span className={cn("max-sm:hidden", inspectorOpen && !enlarged && "hidden")}>{enlarged ? "Exit full screen" : "Enlarge Map"}</span>
            </Button>
          </div>
        )}

        {/* Right dock: inspector, or the receipt in full screen */}
        {inspectorOpen && draft && (
          <div
            className={cn(
              "absolute right-3 bottom-3 z-[600] w-[350px] max-w-[calc(100%-1.5rem)]",
              enlarged ? "top-[8.25rem]" : "top-3",
              drawing && "max-md:hidden",
            )}
          >
            <RoadblockInspector
              draft={draft}
              isNew={isNew}
              queuedForRemoval={queuedForRemoval}
              drawingKind={drawing?.kind ?? null}
              onCancel={closeInspector}
              onLocate={(rb) => flyTo(rb)}
              onDraw={(kind) => (drawing?.kind === kind ? setDrawing(null) : startDraw(kind))}
              onLocateSegment={(seg) => setFocus({ kind: "bounds", points: seg.path, key: `seg-${seg.id}-${Date.now()}` })}
              onRemoveSegment={(id) => updateSegments((segs) => segs.filter((s) => s.id !== id))}
              onModesChange={(modes) => setDraft((d) => d && { ...d, modes })}
              onSegmentModesChange={(id, modes) => updateSegments((segs) => segs.map((s) => (s.id === id ? { ...s, modes } : s)))}
              onRadiusChange={(radiusM) => setDraft((d) => d && { ...d, radiusM })}
              onPatch={(patch) => changeDraft((d) => ({ ...d, ...patch }))}
              onToggleSegmentKind={(id) => {
                const seg = draft.segments?.find((s) => s.id === id);
                if (seg?.kind === "partial" && draft.dailyWindow) {
                  toast("Now a full closure", { description: "A full block closes the road all day, so the daily hours were removed." });
                }
                updateSegments((segs) => segs.map((s) => (s.id === id ? { ...s, kind: s.kind === "full" ? "partial" : "full" } : s)));
              }}
              onSave={(rb) => {
                queueChange({ kind: isNew ? "add" : "edit", roadblock: rb });
                toast.success(isNew ? `Added ${rb.road} to the receipt` : `Queued changes to ${rb.road}`);
                closeInspector();
              }}
              onRemove={(rb) => {
                queueChange({ kind: "remove", roadblock: rb });
                toast(`Queued: remove ${rb.road}`);
                closeInspector();
              }}
            />
          </div>
        )}
        {enlarged && !inspectorOpen && showReceipt && (
          <div className="absolute top-[8.25rem] right-3 bottom-3 z-[500] w-[350px] max-w-[calc(100%-1.5rem)] overflow-y-auto">
            <AuditReceipt compact onSelect={handleReceiptSelect} onReview={reviewReceipt} />
          </div>
        )}

        {/* Status bar */}
        {enlarged && (
          <div className="absolute bottom-3 left-1/2 z-[500] hidden -translate-x-1/2 items-center gap-3 rounded-full bg-white/95 px-4 py-1.5 text-xs whitespace-nowrap text-slate-600 shadow-lg lg:flex">
            <span>{canvasPins.length} pins</span>
            <span className="h-3 w-px bg-slate-200" />
            <span>{canvasPins.reduce((n, r) => n + (r.segments?.length ?? 0), 0)} drawn segments</span>
            <span className="h-3 w-px bg-slate-200" />
            <span>{pending.length} queued change{pending.length === 1 ? "" : "s"}</span>
            <span className="h-3 w-px bg-slate-200" />
            <span>Tool: {drawing ? `Draw ${drawing.kind} block` : preset ? preset.label : "Select & move"}</span>
          </div>
        )}
      </div>

      {/* ---------- Receipt + announcement queue ---------- */}
      <div className="min-w-0 space-y-6">
        {!enlarged && <AuditReceipt selectedId={draft?.id} onSelect={handleReceiptSelect} />}
        <AnnouncementQueue />
      </div>
    </div>
  );
}
