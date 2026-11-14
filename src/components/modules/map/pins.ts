// Client-only: imports Leaflet, so only load from components rendered with `ssr: false`.
import L from "leaflet";
import { CLOSURE_TYPES, closureTypeOf, type ClosureTypeId } from "@/lib/closure-type";
import type { Roadblock } from "@/lib/types";

const CONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.05 10.966a5 2.5 0 0 1-8.1 0"/><path d="m16.923 14.049 4.48 2.04a1 1 0 0 1 .001 1.831l-8.574 3.9a2 2 0 0 1-1.66 0l-8.574-3.91a1 1 0 0 1 0-1.83l4.484-2.04"/><path d="M16.949 14.14a5 2.5 0 1 1-9.9 0L10.063 3.5a2 2 0 0 1 3.874 0z"/><path d="M9.194 6.57a5 2.5 0 0 0 5.61 0"/></svg>`;

const TRAIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/></svg>`;

const SUN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
const MOON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
const CALENDAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>`;
const TYPE_BADGE: Partial<Record<ClosureTypeId, string>> = { day: SUN_SVG, night: MOON_SVG, scheduled: CALENDAR_SVG };

/** Pin colour: overdue and completed first, otherwise the closure type's colour. */
export function pinColor(rb: Roadblock, overdue = false) {
  if (overdue) return { bg: "#e11d48", glow: "rgba(225,29,72,.35)" };
  if (rb.status === "completed") return { bg: "#10b981", glow: "rgba(16,185,129,.3)" };
  const t = CLOSURE_TYPES[closureTypeOf(rb)];
  return { bg: t.color, glow: t.glow };
}

// Icons are cached by appearance. Handing react-leaflet a new icon object on
// every render makes Leaflet call setIcon(), which rebuilds the marker's drag
// handler and cancels a drag in progress (the map re-renders every second).
const iconCache = new Map<string, L.DivIcon>();

export function roadblockIcon(
  rb: Roadblock,
  opts: { selected?: boolean; overdue?: boolean; pending?: "add" | "edit" | "remove" } = {},
) {
  const { bg } = pinColor(rb, opts.overdue);
  const key = [bg, closureTypeOf(rb), rb.status, !!opts.selected, opts.pending ?? ""].join("|");
  let icon = iconCache.get(key);
  if (!icon) {
    icon = buildRoadblockIcon(rb, opts);
    iconCache.set(key, icon);
  }
  return icon;
}

function buildRoadblockIcon(
  rb: Roadblock,
  opts: { selected?: boolean; overdue?: boolean; pending?: "add" | "edit" | "remove" },
) {
  const { bg, glow } = pinColor(rb, opts.overdue);
  const size = opts.selected ? 44 : 36;
  const pulse = rb.status === "active" && !opts.pending ? `<span class="pulse" style="background:${glow}"></span>` : "";
  const ring = opts.selected ? "#1e40af" : "#ffffff";
  // Sun / moon / calendar badge so timed and upcoming works read differently from 24-hour closures.
  const glyph = rb.status !== "completed" ? TYPE_BADGE[closureTypeOf(rb)] : undefined;
  const typeBadge = glyph
    ? `<span style="position:absolute;bottom:-2px;right:-2px;width:18px;height:18px;border-radius:999px;background:white;color:${bg};display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(15,23,42,.35)">${glyph}</span>`
    : "";
  const pendingBadge = opts.pending
    ? `<span style="position:absolute;top:-4px;right:-4px;background:${opts.pending === "remove" ? "#e11d48" : "#1d4ed8"};color:white;font-size:9px;font-weight:700;border-radius:999px;padding:1px 5px;border:2px solid white">${opts.pending === "add" ? "NEW" : opts.pending === "edit" ? "EDIT" : "DEL"}</span>`
    : "";
  return L.divIcon({
    className: "mu-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;${opts.pending === "remove" ? "opacity:.45" : ""}">
      ${pulse}
      <div style="position:relative;width:${size - 8}px;height:${size - 8}px;border-radius:999px;background:${bg};color:white;display:flex;align-items:center;justify-content:center;border:3px solid ${ring};box-shadow:0 6px 16px rgba(15,23,42,.35);transition:all .2s">${CONE_SVG}</div>
      ${typeBadge}
      ${pendingBadge}
    </div>`,
  });
}

export function stopIcon(label: string, kind: "origin" | "via" | "destination") {
  const bg = kind === "origin" ? "#1e40af" : kind === "destination" ? "#0f172a" : "#3b82f6";
  return L.divIcon({
    className: "mu-pin",
    iconSize: [32, 40],
    iconAnchor: [16, 38],
    html: `<div style="position:relative;width:32px;height:40px">
      <div style="width:32px;height:32px;border-radius:999px 999px 999px 4px;transform:rotate(-45deg);background:${bg};border:3px solid white;box-shadow:0 6px 16px rgba(15,23,42,.35)"></div>
      <span style="position:absolute;top:6px;left:0;width:32px;text-align:center;color:white;font-weight:700;font-size:13px">${label}</span>
    </div>`,
  });
}

export const stationIcon = L.divIcon({
  className: "mu-pin",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  html: `<div style="width:20px;height:20px;border-radius:999px;background:white;border:3px solid #1e40af;color:#1e40af;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(30,64,175,.35)">${TRAIN_SVG}</div>`,
});

export const youAreHereIcon = L.divIcon({
  className: "mu-pin",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<div style="position:relative;width:22px;height:22px"><span class="pulse" style="background:rgba(59,130,246,.35)"></span><div style="position:absolute;inset:3px;border-radius:999px;background:#2563eb;border:3px solid white;box-shadow:0 2px 8px rgba(37,99,235,.5)"></div></div>`,
});

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The place a deep link opened (a followed area or a station): pulsing dot with its name. */
export function placeIcon(label: string, kind: "area" | "station" = "area") {
  const dot = kind === "station" ? "#1e40af" : "#0284c7";
  return L.divIcon({
    className: "mu-pin",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div style="position:absolute;left:0;top:0;pointer-events:none">
      <div style="position:absolute;left:-13px;top:-13px;width:26px;height:26px"><span class="pulse" style="background:${dot}55"></span><div style="position:absolute;inset:4px;border-radius:999px;background:${dot};border:3px solid white;box-shadow:0 2px 10px rgba(15,23,42,.35)"></div></div>
      <span style="position:absolute;top:18px;left:0;transform:translateX(-50%);white-space:nowrap;background:white;color:#0f172a;font:600 13px/1.2 var(--font-geist-sans),sans-serif;padding:5px 10px;border-radius:999px;box-shadow:0 6px 16px rgba(15,23,42,.18)">${escapeHtml(label)}</span>
    </div>`,
  });
}
