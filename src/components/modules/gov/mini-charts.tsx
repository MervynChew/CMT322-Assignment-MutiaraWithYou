"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type BarDatum = { label: string; value: number };

/**
 * Sequential blue ramp (one hue, light → dark, lightness strictly decreasing).
 * Bigger values get deeper blue. The palest steps sit below 3:1 on white, so
 * every chart that uses them also shows the numbers (labels or tooltips).
 */
export const BLUE_RAMP = ["#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a"] as const;

/** Ramp colour for a value from 0 (smallest) to 1 (largest); starts at the second step so bars never vanish. */
export function rampBlue(t: number, from = 1) {
  const steps = BLUE_RAMP.length - 1 - from;
  return BLUE_RAMP[from + Math.round(Math.max(0, Math.min(1, t)) * steps)];
}

/** Single-series vertical bar chart: deeper blue for bigger values, the peak labelled, a tooltip on every bar. */
export function BarChart({
  data,
  height = 120,
  showAxis = true,
  unit = "reports",
}: {
  data: BarDatum[];
  height?: number;
  showAxis?: boolean;
  unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const peak = data.findIndex((d) => d.value === max);

  return (
    <div className="w-full">
      <div className="relative flex items-end gap-1.5 border-b border-slate-200 pt-5 sm:gap-2" style={{ height: height + 20 }}>
        {/* recessive gridlines */}
        {[0.5, 1].map((f) => (
          <span key={f} aria-hidden className="absolute inset-x-0 border-t border-dashed border-slate-100" style={{ bottom: f * height - 1 }} />
        ))}
        {data.map((d, i) => {
          const t = max === min ? 1 : (d.value - min) / (max - min);
          return (
            <div
              key={d.label + i}
              className="relative flex h-full flex-1 items-end justify-center"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className={cn("w-full max-w-11 rounded-t-[4px] transition-opacity duration-200", hover !== null && hover !== i && "opacity-40")}
                style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0, background: rampBlue(t) }}
              />
              {/* Only the peak carries a permanent label; the rest show on hover */}
              {i === peak && hover === null && (
                <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs font-semibold text-slate-700 tabular-nums" style={{ bottom: `calc(${(d.value / max) * 100}% + 4px)` }}>
                  {d.value}
                </span>
              )}
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg">
                  <span className="font-semibold">{d.value}</span> {unit} · {d.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showAxis && (
        <div className="mt-1.5 flex gap-1.5 text-[11px] text-slate-500 sm:gap-2">
          {data.map((d, i) => (
            <span key={d.label + i} className="flex-1 truncate text-center">
              {data.length > 10 && i % 2 ? "" : d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Horizontal bars, direct-labelled, in the blue ramp (deeper blue = more). */
export function HBarList({ data, max: maxIn, limit }: { data: BarDatum[]; max?: number; limit?: number }) {
  const max = maxIn ?? Math.max(1, ...data.map((d) => d.value));
  const values = data.map((d) => d.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return (
    <ul className="space-y-2.5">
      {data.slice(0, limit).map((d) => (
        <li key={d.label} className="group grid grid-cols-[minmax(0,8rem)_1fr_3rem] items-center gap-3 text-sm" title={`${d.label}: ${d.value.toLocaleString("en-MY")}`}>
          <span className="truncate text-slate-600">{d.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-blue-50">
            <span
              className="block h-full rounded-full transition-[filter] duration-200 group-hover:brightness-90"
              style={{ width: `${(d.value / max) * 100}%`, background: rampBlue(hi === lo ? 1 : (d.value - lo) / (hi - lo), 2) }}
            />
          </span>
          <span className="text-right font-semibold text-slate-800 tabular-nums">{d.value.toLocaleString("en-MY")}</span>
        </li>
      ))}
    </ul>
  );
}

/** Two-part proportion bar (done vs remaining), deep blue for done and pale blue for what's left. */
export function SplitBar({ a, b, aLabel, bLabel }: { a: number; b: number; aLabel: string; bLabel: string }) {
  const total = Math.max(1, a + b);
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        <span className="h-full rounded-l-full bg-blue-700" style={{ width: `${(a / total) * 100}%` }} title={`${aLabel}: ${a}`} />
        <span className="h-full rounded-r-full bg-blue-200" style={{ width: `${(b / total) * 100}%` }} title={`${bLabel}: ${b}`} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-blue-700" /> {aLabel} <b className="text-slate-900">{a}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-blue-200 ring-1 ring-blue-300" /> {bLabel} <b className="text-slate-900">{b}</b>
        </span>
      </div>
    </div>
  );
}
