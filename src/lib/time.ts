import type { DailyWindow, Roadblock } from "./types";

// Fixed locale and time zone so the server render and the browser always agree
// (otherwise dates can differ between them and break hydration).
export const APP_TIME_ZONE = "Asia/Kuala_Lumpur";
const fmtDate = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric", timeZone: APP_TIME_ZONE });
const fmtShort = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", timeZone: APP_TIME_ZONE });
const fmtDateTime = new Intl.DateTimeFormat("en-MY", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
});

/** Node and browsers ship different ICU data; some emit U+202F (narrow no-break space) before "am/pm". */
const plain = (s: string) => s.replace(/[\u202f\u00a0]/g, " ");

export const formatDate = (iso: string) => plain(fmtDate.format(new Date(iso)));
export const formatShortDate = (iso: string) => plain(fmtShort.format(new Date(iso)));
export const formatDateTime = (iso: string) => plain(fmtDateTime.format(new Date(iso)));
export const formatNumber = (n: number) => n.toLocaleString("en-MY");
export const formatPeriod = (start: string, end: string) =>
  `${formatShortDate(start)} – ${formatDate(end)}`;

/** "08:00" → "8:00 AM" */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const formatWindow = (w?: DailyWindow) =>
  w ? `${formatClock(w.start)} – ${formatClock(w.end)} daily` : "24 hours";

export function relativeTime(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60_000);
  const label =
    mins < 1 ? "just now" :
    mins < 60 ? `${mins}m` :
    mins < 60 * 24 ? `${Math.round(mins / 60)}h` :
    `${Math.round(mins / 1440)}d`;
  if (label === "just now") return label;
  return diff >= 0 ? `${label} ago` : `in ${label}`;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function atClock(base: Date, hhmm: string, dayOffset = 0): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

export type ClosureClock = {
  /** Whether the road is closed right now. */
  closedNow: boolean;
  /** Next time the state flips. */
  target: Date;
  label: string;
};

/** Works out whether a roadblock is currently in effect and when that changes next. */
export function closureClock(rb: Roadblock, nowMs: number): ClosureClock | null {
  const now = new Date(nowMs);
  const start = new Date(rb.startDate);
  const end = new Date(rb.endDate);

  if (rb.status === "completed") return null;
  if (now < start) return { closedNow: false, target: start, label: "Closure begins in" };

  if (!rb.dailyWindow) {
    if (now > end) return null;
    return { closedNow: true, target: end, label: "Scheduled to reopen in" };
  }

  const { start: ws, end: we } = rb.dailyWindow;
  const overnight = ws > we;
  const todayStart = atClock(now, ws);
  const todayEnd = atClock(now, we);

  if (!overnight) {
    if (now >= todayStart && now < todayEnd)
      return { closedNow: true, target: todayEnd, label: "Reopens in" };
    const next = now < todayStart ? todayStart : atClock(now, ws, 1);
    return { closedNow: false, target: next, label: "Closes in" };
  }
  // overnight window, e.g. 22:00 – 06:00
  if (now >= todayStart) return { closedNow: true, target: atClock(now, we, 1), label: "Reopens in" };
  if (now < todayEnd) return { closedNow: true, target: todayEnd, label: "Reopens in" };
  return { closedNow: false, target: todayStart, label: "Closes in" };
}

export function isOverdue(rb: Roadblock, nowMs: number): boolean {
  return rb.status !== "completed" && new Date(rb.endDate).getTime() < nowMs;
}

export function isSameDay(iso: string, nowMs: number): boolean {
  const a = new Date(iso);
  const b = new Date(nowMs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
