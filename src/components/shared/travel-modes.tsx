"use client";

import { useMemo } from "react";
import { CarFront, Check, Footprints, Motorbike } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRAVEL_MODES } from "@/lib/mock-data";
import type { ClosureSegment, Roadblock, TravelMode } from "@/lib/types";
import { useStore } from "@/store/useStore";

export const MODE_ICON: Record<TravelMode, typeof CarFront> = {
  car: CarFront,
  motorcycle: Motorbike,
  pedestrian: Footprints,
};

const ORDER = TRAVEL_MODES.map((m) => m.value);
const sortModes = (modes: TravelMode[]) => ORDER.filter((m) => modes.includes(m));

/** "Cars, motorcycles & pedestrians" */
export function modesLabel(modes: TravelMode[]) {
  const names = sortModes(modes).map((m, i) => {
    const label = TRAVEL_MODES.find((x) => x.value === m)!.label;
    return i === 0 ? label : label.toLowerCase();
  });
  if (names.length <= 1) return names[0] ?? "No traffic";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

type Blockable = Pick<Roadblock, "modes" | "segments">;

/** Who a drawn stretch blocks: its own setting, or the roadblock's when it has none. */
export const segmentModes = (rb: Pick<Roadblock, "modes">, seg: ClosureSegment): TravelMode[] =>
  seg.modes?.length ? seg.modes : rb.modes;

/**
 * Everyone a roadblock blocks. Drawn stretches decide when there are any;
 * a roadblock with nothing drawn falls back to its own setting.
 */
export function effectiveModes(rb: Blockable): TravelMode[] {
  if (!rb.segments?.length) return rb.modes;
  return sortModes([...new Set(rb.segments.flatMap((s) => segmentModes(rb, s)))]);
}

/** Does this roadblock block any of the selected kinds of traffic? */
export const affects = (rb: Blockable, filter: TravelMode[]) => effectiveModes(rb).some((m) => filter.includes(m));

/** Keeps only what matters for the selected traffic: the roadblock, and of its drawn stretches only those that block it. */
export function filterByModes<T extends Blockable>(roadblocks: T[], filter: TravelMode[]): T[] {
  if (filter.length === ORDER.length) return roadblocks;
  const out: T[] = [];
  for (const rb of roadblocks) {
    if (!rb.segments?.length) {
      if (rb.modes.some((m) => filter.includes(m))) out.push(rb);
      continue;
    }
    const kept = rb.segments.filter((s) => segmentModes(rb, s).some((m) => filter.includes(m)));
    if (kept.length) out.push(kept.length === rb.segments.length ? rb : { ...rb, segments: kept });
  }
  return out;
}

/** Roadblocks filtered by the viewer's travel-mode choice (stable array between renders). */
export function useModeFilteredRoadblocks<T extends Blockable>(roadblocks: T[]): T[] {
  const filter = useStore((s) => s.modeFilter);
  return useMemo(() => filterByModes(roadblocks, filter), [roadblocks, filter]);
}

/** Small icon chips showing who a roadblock blocks. */
export function ModeChips({ modes, className, tone = "light" }: { modes: TravelMode[]; className?: string; tone?: "light" | "glass" }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={`Blocks ${modesLabel(modes).toLowerCase()}`}>
      {sortModes(modes).map((m) => {
        const Icon = MODE_ICON[m];
        const label = TRAVEL_MODES.find((x) => x.value === m)!.short;
        return (
          <span
            key={m}
            title={`Blocks ${label.toLowerCase()} traffic`}
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-full",
              tone === "glass" ? "bg-black/55 text-white backdrop-blur-sm" : "bg-slate-100 text-slate-600",
            )}
          >
            <Icon className="size-3.5" />
          </span>
        );
      })}
    </span>
  );
}

/**
 * Public toggle: which kinds of roadblock to show (at least one stays on).
 * `tiles` fills the width with three large, clearly ticked buttons.
 */
export function ModeFilter({ className, tiles }: { className?: string; tiles?: boolean }) {
  const filter = useStore((s) => s.modeFilter);
  const setFilter = useStore((s) => s.setModeFilter);

  return (
    <div
      role="group"
      aria-label="Show roadblocks for"
      className={cn(tiles ? "grid grid-cols-3 gap-2" : "flex flex-wrap items-center gap-2", className)}
    >
      {TRAVEL_MODES.map((m) => {
        const on = filter.includes(m.value);
        const Icon = MODE_ICON[m.value];
        const last = on && filter.length === 1;
        return (
          <button
            key={m.value}
            type="button"
            aria-pressed={on}
            aria-label={`${m.label}: ${on ? "shown" : "hidden"}`}
            title={last ? "Keep at least one type selected" : on ? `Hide roadblocks for ${m.label.toLowerCase()}` : `Show roadblocks for ${m.label.toLowerCase()}`}
            onClick={() => !last && setFilter(on ? filter.filter((x) => x !== m.value) : [...filter, m.value])}
            className={cn(
              "group/mode relative flex items-center font-medium ring-1 transition-[background-color,color,box-shadow,transform] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.97]",
              tiles ? "flex-col justify-center gap-1 rounded-2xl px-2 pt-2 pb-1.5 text-[13px] sm:gap-1.5 sm:pt-2.5 sm:pb-2" : "h-10 gap-2 rounded-full pr-3.5 pl-1.5 text-sm",
              on
                ? "bg-blue-50 text-blue-900 ring-blue-200 hover:bg-blue-100/70"
                : "bg-white text-slate-500 ring-slate-200 hover:text-slate-700 hover:ring-slate-300",
              last && "cursor-default",
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-full transition-colors duration-200",
                tiles ? "size-8 sm:size-9" : "size-7",
                on ? "bg-blue-600 text-white shadow-sm shadow-blue-700/30" : "bg-slate-100 text-slate-400 group-hover/mode:text-slate-600",
              )}
            >
              <Icon className={tiles ? "size-[18px]" : "size-4"} />
            </span>
            {tiles ? m.label : m.short}
            {/* Tick / empty circle so the state never relies on colour alone */}
            <span
              aria-hidden
              className={cn(
                "flex items-center justify-center rounded-full transition-all duration-200",
                tiles ? "absolute top-1.5 right-1.5 size-4" : "size-4",
                on ? "bg-blue-600 text-white" : "ring-1 ring-slate-300 ring-inset",
              )}
            >
              <Check className={cn("size-2.5 transition-transform duration-200", on ? "scale-100" : "scale-0")} strokeWidth={3.5} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Admin multi-select: who does this roadblock (or drawn stretch) block? */
export function ModePicker({
  value,
  onChange,
  className,
  dark,
  compact,
  label = "Blocked traffic",
}: {
  value: TravelMode[];
  onChange: (modes: TravelMode[]) => void;
  className?: string;
  /** Styling for the dark drawing toolbar. */
  dark?: boolean;
  /** Small icon-only toggles, for rows such as a drawn stretch. */
  compact?: boolean;
  label?: string;
}) {
  if (compact) {
    return (
      <div role="group" aria-label={label} className={cn("inline-flex items-center gap-1", className)}>
        {TRAVEL_MODES.map((m) => {
          const on = value.includes(m.value);
          const Icon = MODE_ICON[m.value];
          return (
            <button
              key={m.value}
              type="button"
              aria-pressed={on}
              aria-label={`${m.label}: ${on ? "blocked" : "can pass"}`}
              title={`${m.label}: ${on ? "blocked" : "can pass"} (click to change)`}
              onClick={() => {
                const next = on ? value.filter((x) => x !== m.value) : sortModes([...value, m.value]);
                if (next.length) onChange(next);
              }}
              className={cn(
                "flex size-7 items-center justify-center rounded-lg ring-1 transition-colors duration-200",
                on ? "bg-red-50 text-red-700 ring-red-200" : "bg-white text-slate-300 ring-slate-200 hover:text-slate-500",
              )}
            >
              <Icon className="size-3.5" />
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div role="group" aria-label={label} className={cn("grid grid-cols-3 gap-1.5", className)}>
      {TRAVEL_MODES.map((m) => {
        const on = value.includes(m.value);
        const Icon = MODE_ICON[m.value];
        return (
          <button
            key={m.value}
            type="button"
            aria-pressed={on}
            onClick={() => {
              const next = on ? value.filter((x) => x !== m.value) : sortModes([...value, m.value]);
              if (next.length) onChange(next);
            }}
            title={on && value.length === 1 ? "A roadblock must block at least one type of traffic" : undefined}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-xs font-medium transition-[background-color,border-color,color] duration-200",
              dark
                ? on
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200"
                : on
                  ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            {on && (
              <span className={cn("absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full", dark ? "bg-white text-slate-900" : "bg-blue-600 text-white")}>
                <Check className="size-2.5" strokeWidth={3} />
              </span>
            )}
            <Icon className="size-4" />
            {m.short}
          </button>
        );
      })}
    </div>
  );
}
