import { Ban, CalendarPlus, CircleDot, Moon, Sun, type LucideIcon } from "lucide-react";
import { AREAS, SITE_IMAGES } from "@/lib/mock-data";
import { haversine } from "@/lib/geo";
import type { LatLng, Roadblock } from "@/lib/types";

/** Canvas tools: each one drops a roadblock pre-configured for a type of closure. */
export type ClosurePreset = {
  id: "full" | "partial" | "day" | "night" | "scheduled";
  label: string;
  hint: string;
  icon: LucideIcon;
  swatch: string; // tailwind bg class for the tool chip
  apply: (rb: Roadblock, now: Date) => Roadblock;
};

/** Starting size of a new roadblock's blocked zone, and the range an admin can set. */
export const DEFAULT_RADIUS_M = 150;
export const RADIUS_MIN = 50;
export const RADIUS_MAX = 1000;

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

export const CLOSURE_PRESETS: ClosurePreset[] = [
  {
    id: "full",
    label: "Full closure",
    hint: "Road fully closed, 24 hours",
    icon: Ban,
    swatch: "bg-red-600",
    apply: (rb) => ({ ...rb, closure: "full", status: "active", dailyWindow: undefined }),
  },
  {
    id: "partial",
    label: "Lane closure",
    hint: "Partial closure, 24 hours",
    icon: CircleDot,
    swatch: "bg-amber-500",
    apply: (rb) => ({ ...rb, closure: "partial", status: "active", dailyWindow: undefined }),
  },
  {
    id: "day",
    label: "Daytime works",
    hint: "Partial, 8:00 AM – 5:00 PM",
    icon: Sun,
    swatch: "bg-orange-500",
    apply: (rb) => ({ ...rb, closure: "partial", status: "active", dailyWindow: { start: "08:00", end: "17:00" } }),
  },
  {
    id: "night",
    label: "Night works",
    hint: "Partial, 10:00 PM – 6:00 AM",
    icon: Moon,
    swatch: "bg-indigo-600",
    apply: (rb) => ({ ...rb, closure: "partial", status: "active", dailyWindow: { start: "22:00", end: "06:00" } }),
  },
  {
    id: "scheduled",
    label: "Upcoming closure",
    hint: "Full closure starting in 7 days",
    icon: CalendarPlus,
    swatch: "bg-slate-500",
    apply: (rb, now) => ({
      ...rb,
      closure: "full",
      status: "scheduled",
      dailyWindow: undefined,
      startDate: addDays(now, 7).toISOString(),
      endDate: addDays(now, 67).toISOString(),
    }),
  },
];

/** Nearest area to a pin, used to pre-fill new roadblocks. */
export function nearestAreaId(at: LatLng) {
  return AREAS.reduce((best, a) => (haversine(at, a) < haversine(at, best) ? a : best), AREAS[0]).id;
}

export function blankRoadblock(id: string, at: LatLng, now: Date): Roadblock {
  return {
    id,
    road: "",
    areaId: nearestAreaId(at),
    lat: at.lat,
    lng: at.lng,
    closure: "partial",
    modes: ["car", "motorcycle"],
    radiusM: DEFAULT_RADIUS_M,
    status: "active",
    startDate: now.toISOString(),
    endDate: addDays(now, 60).toISOString(),
    phaseIndex: 0,
    description: "",
    detour: "",
    image: SITE_IMAGES[Math.floor(Math.random() * SITE_IMAGES.length)],
    lastUpdated: now.toISOString(),
  };
}
