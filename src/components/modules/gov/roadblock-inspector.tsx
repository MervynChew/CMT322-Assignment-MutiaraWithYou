"use client";

import { useState } from "react";
import { ArchiveRestore, Check, CircleCheck, Crosshair, History, Repeat2, Spline, TrafficCone, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { AREAS, CONSTRUCTION_PHASES } from "@/lib/mock-data";
import { formatDistance, segmentReach } from "@/lib/geo";
import { CLOSURE_TYPES, closureTypeOf } from "@/lib/closure-type";
import { formatDate, formatPeriod, formatWindow } from "@/lib/time";
import type { ArchivedRoadblock, ClosureSegment, ClosureType, Roadblock, TravelMode } from "@/lib/types";
import { ModePicker, modesLabel, segmentModes } from "@/components/shared/travel-modes";
import { CLOSURE_PRESETS, RADIUS_MAX, RADIUS_MIN, type ClosurePreset } from "./closure-presets";

const RADIUS_PRESETS = [100, 250, 500, 1000];

/**
 * Fields shown on the map (the pin's colour and badge, its blocked zone and
 * drawn stretches). They live on the canvas draft so the map updates as soon
 * as they change; the panel mirrors them from there.
 */
const LIVE_FIELDS = ["lat", "lng", "segments", "modes", "radiusM", "closure", "status", "dailyWindow", "startDate", "endDate"] as const;

const toDateInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fromDateInput = (v: string) => new Date(`${v}T00:00:00`).toISOString();

/** Docked side panel for creating / editing a roadblock on the canvas. */
export function RoadblockInspector({
  draft,
  isNew,
  takingDown,
  archived,
  onCancel,
  onSave,
  onRemove,
  onMarkDone,
  onRestore,
  onLocate,
  drawingKind,
  onDraw,
  onLocateSegment,
  onRemoveSegment,
  onToggleSegmentKind,
  onModesChange,
  onSegmentModesChange,
  onRadiusChange,
  onPatch,
  className,
}: {
  draft: Roadblock;
  isNew: boolean;
  /** Queued in the receipt to come off the public map. */
  takingDown: "remove" | "done" | null;
  /** Set when this is a past roadblock (off the public map): shown read-only with Restore. */
  archived: ArchivedRoadblock | null;
  onCancel: () => void;
  onSave: (rb: Roadblock) => void;
  onRemove: (rb: Roadblock) => void;
  /** Completed works: take the roadblock off the public map (kept under Past roadblocks). */
  onMarkDone: (rb: Roadblock) => void;
  onRestore: (rb: Roadblock) => void;
  onLocate: (rb: Roadblock) => void;
  /** Kind of segment currently being drawn on the canvas, if any. */
  drawingKind: ClosureType | null;
  onDraw: (kind: ClosureType) => void;
  onLocateSegment: (seg: ClosureSegment) => void;
  onRemoveSegment: (id: string) => void;
  onToggleSegmentKind: (id: string) => void;
  /** Blocked traffic lives on the canvas draft, so the drawing toolbar and this panel stay in sync. */
  onModesChange: (modes: TravelMode[]) => void;
  onSegmentModesChange: (id: string, modes: TravelMode[]) => void;
  /** The blocked zone is drawn on the canvas, so it lives on the canvas draft too. */
  onRadiusChange: (radiusM: number) => void;
  /** Updates fields that show on the map (closure type, status, hours, dates) on the canvas draft. */
  onPatch: (patch: Partial<Roadblock>) => void;
  className?: string;
}) {
  const [form, setForm] = useState<Roadblock>(draft);
  const [error, setError] = useState<string | null>(null);
  const [prevDraft, setPrevDraft] = useState(draft);
  // Reset when another pin is opened; for the same pin, pick up everything that
  // lives on the canvas (see LIVE_FIELDS) without losing typed text.
  if (draft !== prevDraft) {
    setPrevDraft(draft);
    if (draft.id === prevDraft.id) {
      const live = Object.fromEntries(LIVE_FIELDS.map((k) => [k, draft[k]])) as Partial<Roadblock>;
      setForm({ ...form, ...live, road: form.road || draft.road });
    } else {
      setForm(draft);
    }
    setError(null);
  }
  const segments = form.segments ?? [];
  const derivedClosure: ClosureType | null = segments.length ? (segments.some((x) => x.kind === "full") ? "full" : "partial") : null;
  const type = closureTypeOf(form);
  /** Furthest any drawn stretch reaches from the pin: the blocked zone can't be smaller. */
  const reach = segmentReach(form, segments);
  const minRadius = Math.max(RADIUS_MIN, Math.ceil(reach / 10) * 10);

  const set = <K extends keyof Roadblock>(k: K, v: Roadblock[K]) => setForm((f) => ({ ...f, [k]: v }));

  /** Picking a closure type updates the pin on the map straight away, and brings drawn stretches in line. */
  function chooseType(p: ClosurePreset) {
    const now = new Date();
    let next = p.id === "scheduled" ? p.apply(form, now) : p.apply(form, new Date(form.startDate));
    // Leaving "Upcoming": an active closure starts today, not next week.
    if (p.id !== "scheduled" && form.status === "scheduled" && new Date(next.startDate) > now) {
      next = { ...next, startDate: now.toISOString() };
    }
    const patch: Partial<Roadblock> = {
      closure: next.closure,
      status: next.status,
      dailyWindow: next.dailyWindow,
      startDate: next.startDate,
      endDate: next.endDate,
    };
    if (p.id !== "scheduled" && segments.some((s) => s.kind !== next.closure)) {
      patch.segments = segments.map((s) => ({ ...s, kind: next.closure }));
    }
    onPatch(patch);
  }

  /** The form as a roadblock, or null (with the error shown) when it isn't valid yet. */
  function validated(): Roadblock | null {
    const problem =
      form.road.trim().length < 3 ? "Enter the road name." : form.endDate < form.startDate ? "End date must be after the start date." : null;
    setError(problem);
    if (problem) return null;
    // With drawn segments, the overall closure follows them (any full block makes it full).
    return { ...form, road: form.road.trim(), closure: derivedClosure ?? form.closure };
  }

  function save() {
    const rb = validated();
    if (rb) onSave(rb);
  }

  function markDone() {
    const rb = validated();
    if (rb) onMarkDone({ ...rb, status: "completed" });
  }

  const canMarkDone = !isNew && !takingDown && !archived && form.status === "completed";

  const sel = "h-9 w-full rounded-xl data-[size=default]:h-9";

  return (
    <div className={cn("flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl", className)}>
      <header className="flex items-start gap-3 border-b border-slate-100 p-4">
        <span aria-hidden className="mt-1 size-3 shrink-0 rounded-full ring-4 ring-slate-100" style={{ background: archived ? "#94a3b8" : CLOSURE_TYPES[type].color }} />
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-semibold tracking-wider uppercase", archived ? "text-slate-500" : "text-blue-700")}>
            {archived ? "Past roadblock" : isNew ? "New roadblock" : "Edit roadblock"}
          </p>
          <h3 className="truncate font-semibold">{form.road || "Untitled roadblock"}</h3>
        </div>
        <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => onLocate(form)} aria-label="Zoom to pin">
          <Crosshair />
        </Button>
        <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={onCancel} aria-label="Close inspector">
          <X />
        </Button>
      </header>

      {archived ? (
        <PastSummary archived={archived} />
      ) : takingDown ? (
        <div className="flex-1 p-5 text-sm leading-relaxed text-slate-600">
          {takingDown === "done"
            ? "This roadblock is queued to be marked as done. When you post, it comes off the public map and moves to Past roadblocks."
            : "This roadblock is queued for removal. When you post, it comes off the public map and moves to Past roadblocks."}{" "}
          Undo it from the audit receipt to edit it again.
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <Label id="ins-type-label" className="text-xs text-slate-500">
                Closure type
              </Label>
              <span className="text-xs font-semibold" style={{ color: CLOSURE_TYPES[type].color }}>
                {CLOSURE_TYPES[type].label}
              </span>
            </div>
            <div role="radiogroup" aria-labelledby="ins-type-label" className="grid grid-cols-2 gap-1.5">
              {CLOSURE_PRESETS.map((p) => {
                const on = type === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => !on && chooseType(p)}
                    className={cn(
                      "relative flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition-[background-color,border-color,box-shadow]",
                      on
                        ? "border-blue-600 bg-blue-50 font-semibold text-blue-950 shadow-sm ring-2 ring-blue-600"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-lg text-white", p.swatch)}>
                      <p.icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 font-medium">{p.label}</span>
                    {on && (
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* What the public will see on the map */}
            <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-white"
                style={{ background: CLOSURE_TYPES[type].color }}
              >
                <TrafficCone className="size-3.5" />
              </span>
              <span>
                The map shows a <b className="font-semibold text-slate-800">{CLOSURE_TYPES[type].label.toLowerCase()}</b> pin:{" "}
                {CLOSURE_TYPES[type].meaning.toLowerCase()}
                {form.dailyWindow && type !== "full" && type !== "scheduled" ? ` (${form.dailyWindow.start} – ${form.dailyWindow.end})` : ""}.
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-slate-500">Drawn on the road</Label>
              <span className="text-xs text-slate-400">
                {segments.length
                  ? `${segments.length} stretch${segments.length === 1 ? "" : "es"} · ${formatDistance(segments.reduce((n, x) => n + x.lengthM, 0))}`
                  : "Nothing drawn"}
              </span>
            </div>
            {segments.length > 0 && (
              <>
                <p className="mt-1 text-xs leading-snug text-slate-500">Each stretch decides who it blocks. Tap an icon to switch it.</p>
                <ul className="mt-2 space-y-1.5">
                  {segments.map((seg) => (
                    <li key={seg.id} className="rounded-xl bg-slate-50 p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={cn(
                            "h-1.5 w-6 shrink-0 rounded-full",
                            seg.kind === "full" ? "bg-red-600" : "bg-[repeating-linear-gradient(90deg,#f59e0b_0_6px,transparent_6px_9px)]",
                          )}
                        />
                        <button type="button" onClick={() => onLocateSegment(seg)} className="min-w-0 flex-1 text-left hover:text-blue-700" title="Show on map">
                          <span className="block truncate font-medium">{seg.road}</span>
                          <span className="text-slate-500">
                            {seg.kind === "full" ? "Full block" : "Partial block"} · {formatDistance(seg.lengthM)}
                          </span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="rounded-full"
                          aria-label={`Change ${seg.road} to ${seg.kind === "full" ? "partial" : "full"} block`}
                          title={`Switch to ${seg.kind === "full" ? "partial" : "full"} block`}
                          onClick={() => onToggleSegmentKind(seg.id)}
                        >
                          <Repeat2 />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="rounded-full hover:text-destructive"
                          aria-label={`Delete the stretch on ${seg.road}`}
                          onClick={() => onRemoveSegment(seg.id)}
                        >
                          <X />
                        </Button>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-1.5 pl-8">
                        <span className="truncate text-slate-500">Blocks {modesLabel(segmentModes(form, seg)).toLowerCase()}</span>
                        <ModePicker
                          compact
                          label={`Who the stretch on ${seg.road} blocks`}
                          value={segmentModes(form, seg)}
                          onChange={(modes) => onSegmentModesChange(seg.id, modes)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {(["full", "partial"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onDraw(kind)}
                  aria-pressed={drawingKind === kind}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs font-medium transition",
                    drawingKind === kind
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-dashed border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50",
                  )}
                >
                  <Spline className={cn("size-3.5", drawingKind === kind ? "text-white" : kind === "full" ? "text-red-600" : "text-amber-500")} />
                  {drawingKind === kind ? "Drawing…" : `Draw ${kind} block`}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs leading-snug text-slate-500">
              Draw inside the blocked zone (the blue circle, {formatDistance(form.radiusM)} around the pin). To reach further, make the radius bigger below.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <Label className="text-xs text-slate-500">{segments.length ? "Default for new stretches" : "Who is blocked?"}</Label>
              <span className="truncate text-xs text-slate-400">{modesLabel(form.modes)}</span>
            </div>
            <p className="mb-2 text-xs leading-snug text-slate-500">
              {segments.length
                ? "Drawn stretches set who is blocked. This is used for new stretches, and again if every stretch is removed."
                : "Nothing is drawn yet, so this applies to the whole blocked zone around the pin."}
            </p>
            <ModePicker value={form.modes} onChange={onModesChange} label="Who the roadblock blocks" />
          </div>

          <div className={cn("rounded-2xl border border-slate-200 p-3", segments.length > 0 && "bg-slate-50/60")}>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="ins-radius" className="text-xs text-slate-500">
                Blocked zone radius
              </Label>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800 tabular-nums">{formatDistance(form.radiusM)}</span>
            </div>
            <input
              id="ins-radius"
              type="range"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={10}
              value={form.radiusM}
              // Never smaller than the drawn stretches: every drawing stays inside its roadblock's zone.
              onChange={(e) => onRadiusChange(Math.max(minRadius, Number(e.target.value)))}
              aria-describedby="ins-radius-hint"
              className="mt-2 w-full accent-blue-700"
            />
            <div className="mt-1 flex gap-1.5">
              {RADIUS_PRESETS.map((r) => {
                const tooSmall = r < minRadius;
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={tooSmall}
                    onClick={() => onRadiusChange(r)}
                    aria-pressed={form.radiusM === r}
                    title={tooSmall ? `The drawn stretches reach ${formatDistance(reach)} from the pin` : undefined}
                    className={cn(
                      "flex-1 rounded-lg py-1 text-xs font-medium ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      form.radiusM === r ? "bg-blue-700 text-white ring-blue-700" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300",
                    )}
                  >
                    {formatDistance(r)}
                  </button>
                );
              })}
            </div>
            <p id="ins-radius-hint" className="mt-1.5 text-xs leading-snug text-slate-500">
              {segments.length
                ? `Drawn stretches must stay inside this circle, so it can't be smaller than ${formatDistance(minRadius)}. While stretches are drawn, they decide what is blocked.`
                : "Routes passing within this distance of the pin count as blocked. Any stretch you draw must stay inside it."}
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ins-road" className="text-xs text-slate-500">Road name</Label>
            <Input id="ins-road" autoFocus={isNew} value={form.road} onChange={(e) => set("road", e.target.value)} placeholder="e.g. Jalan Tun Razak" className="h-9 rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label className="text-xs text-slate-500">Area</Label>
              <Select value={form.areaId} onValueChange={(v) => set("areaId", v)}>
                <SelectTrigger className={sel}><SelectValue /></SelectTrigger>
                <SelectContent position="popper" className="z-[1300]">
                  {AREAS.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-slate-500">Status</Label>
              <Select value={form.status} onValueChange={(v) => onPatch({ status: v as Roadblock["status"] })}>
                <SelectTrigger className={sel}><SelectValue /></SelectTrigger>
                <SelectContent position="popper" className="z-[1300]">
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs text-slate-500">Closure extent</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={derivedClosure ?? form.closure}
              disabled={derivedClosure !== null}
              onValueChange={(v) => v && onPatch({ closure: v as Roadblock["closure"] })}
              className="w-full"
            >
              <ToggleGroupItem value="partial" className="flex-1 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-900">Partial</ToggleGroupItem>
              <ToggleGroupItem value="full" className="flex-1 data-[state=on]:bg-red-100 data-[state=on]:text-red-800">Full</ToggleGroupItem>
            </ToggleGroup>
            {derivedClosure ? (
              <p className="text-xs text-slate-400">Set by the drawn stretches: any full block makes it a full closure.</p>
            ) : (
              form.dailyWindow && <p className="text-xs text-slate-400">Full closes the road all day, so it removes the daily hours.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ins-start" className="text-xs text-slate-500">Start date</Label>
              <Input id="ins-start" type="date" value={toDateInput(form.startDate)} onChange={(e) => e.target.value && onPatch({ startDate: fromDateInput(e.target.value) })} className="h-9 rounded-xl" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ins-end" className="text-xs text-slate-500">End date</Label>
              <Input id="ins-end" type="date" value={toDateInput(form.endDate)} onChange={(e) => e.target.value && onPatch({ endDate: fromDateInput(e.target.value) })} className="h-9 rounded-xl" />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <label className="flex items-center justify-between gap-3 text-xs font-medium">
              Time-specific (daily hours)
              <Switch checked={!!form.dailyWindow} onCheckedChange={(v) => onPatch({ dailyWindow: v ? { start: "08:00", end: "17:00" } : undefined })} />
            </label>
            {form.dailyWindow ? (
              <>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="ins-open" className="text-xs text-slate-500">Closes at</Label>
                    <Input id="ins-open" type="time" value={form.dailyWindow.start} onChange={(e) => e.target.value && onPatch({ dailyWindow: { ...form.dailyWindow!, start: e.target.value } })} className="h-9 rounded-xl bg-white" />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="ins-close" className="text-xs text-slate-500">Reopens at</Label>
                    <Input id="ins-close" type="time" value={form.dailyWindow.end} onChange={(e) => e.target.value && onPatch({ dailyWindow: { ...form.dailyWindow!, end: e.target.value } })} className="h-9 rounded-xl bg-white" />
                  </div>
                </div>
                {(type === "day" || type === "night") && (
                  <p className="mt-2 flex items-start gap-2 text-xs leading-snug text-slate-600">
                    <span aria-hidden className="mt-1 size-2 shrink-0 rounded-full" style={{ background: CLOSURE_TYPES[type].color }} />
                    <span>
                      Lanes close only during these hours, so this is{" "}
                      <b className="font-semibold" style={{ color: CLOSURE_TYPES[type].color }}>{CLOSURE_TYPES[type].label.toLowerCase()}</b>.
                      {" "}Closing in the evening (6 PM or later) or overnight counts as night works.
                    </span>
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-xs leading-snug text-slate-500">
                {type === "full"
                  ? "Closed all day. Turn this on to close lanes only during set hours; it then becomes daytime or night works."
                  : "Turn this on to close lanes only during set hours (daytime or night works)."}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs text-slate-500">Construction phase</Label>
            <Select value={String(form.phaseIndex)} onValueChange={(v) => set("phaseIndex", Number(v))}>
              <SelectTrigger className={sel}><SelectValue /></SelectTrigger>
              <SelectContent position="popper" className="z-[1300]">
                {CONSTRUCTION_PHASES.map((p, i) => <SelectItem key={p} value={String(i)}>{i + 1}. {p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ins-desc" className="text-xs text-slate-500">Description</Label>
            <Textarea id="ins-desc" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} className="rounded-xl" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ins-detour" className="text-xs text-slate-500">Detour advice</Label>
            <Input id="ins-detour" value={form.detour} onChange={(e) => set("detour", e.target.value)} className="h-9 rounded-xl" />
          </div>
          <p className="font-mono text-xs text-slate-400">
            {form.lat.toFixed(5)}, {form.lng.toFixed(5)} · drag the pin to reposition (saved with this roadblock)
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {canMarkDone && (
        <div className="flex items-center gap-2.5 border-t border-teal-100 bg-teal-50/80 px-3 py-2.5">
          <CircleCheck aria-hidden className="size-4 shrink-0 text-teal-600" />
          <p className="min-w-0 flex-1 text-xs leading-snug text-teal-950">
            <b className="font-semibold">Works completed.</b> Take it off the public map and home page. You can restore it later.
          </p>
          <Button size="sm" className="shrink-0 rounded-full bg-teal-600 hover:bg-teal-700" onClick={markDone}>
            Mark as done
          </Button>
        </div>
      )}

      <footer className="flex items-center gap-2 border-t border-slate-100 p-3">
        {!isNew && !takingDown && !archived && (
          <Button variant="destructive" size="sm" className="rounded-full" onClick={() => onRemove(form)}>
            <Trash2 /> Remove
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" className="rounded-full" onClick={onCancel}>Cancel</Button>
          {archived ? (
            <Button size="sm" className="rounded-full bg-blue-700 hover:bg-blue-800" onClick={() => onRestore(archived.roadblock)}>
              <ArchiveRestore /> Restore
            </Button>
          ) : (
            !takingDown && (
              <Button size="sm" className="rounded-full bg-blue-700 hover:bg-blue-800" onClick={save}>
                {isNew ? "Add to receipt" : "Queue changes"}
              </Button>
            )
          )}
        </div>
      </footer>
    </div>
  );
}

/** Read-only view of a past roadblock: why it came off the map, and what it was. */
export function PastSummary({ archived }: { archived: ArchivedRoadblock }) {
  const rb = archived.roadblock;
  const type = closureTypeOf(rb);
  const segs = rb.segments ?? [];
  const rows: [string, string][] = [
    ["Area", AREAS.find((a) => a.id === rb.areaId)?.name ?? "—"],
    ["Closure", `${CLOSURE_TYPES[type].label}${rb.dailyWindow ? ` · ${formatWindow(rb.dailyWindow)}` : ""}`],
    ["Period", formatPeriod(rb.startDate, rb.endDate)],
    ["Status", rb.status === "completed" ? "Completed" : rb.status === "scheduled" ? "Scheduled" : "Active"],
    ["Drawn", segs.length ? `${segs.length} stretch${segs.length === 1 ? "" : "es"} · ${formatDistance(segs.reduce((n, x) => n + x.lengthM, 0))}` : "Pin only"],
  ];
  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      <div className="rounded-2xl bg-slate-100 p-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <History aria-hidden className="size-4 text-slate-500" />
          {archived.reason === "done" ? "Marked as done" : "Removed"} on {formatDate(archived.at)}
        </p>
        <p className="mt-1 text-xs leading-snug text-slate-600">
          By {archived.by}. It no longer shows on the public map or home page. Restore it to put it back; it goes live when you post.
        </p>
      </div>
      <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3 px-3 py-2">
            <dt className="w-16 shrink-0 text-xs text-slate-500">{label}</dt>
            <dd className="min-w-0 flex-1 text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      {rb.description && <p className="text-sm leading-relaxed text-slate-600">{rb.description}</p>}
    </div>
  );
}
