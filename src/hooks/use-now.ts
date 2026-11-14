"use client";

import { useSyncExternalStore } from "react";

/** One shared clock per tick interval, so every component on the same interval re-renders together. */
type Clock = {
  listeners: Set<() => void>;
  timer: ReturnType<typeof setInterval> | null;
  current: number;
  subscribe: (cb: () => void) => () => void;
  getSnapshot: () => number;
};

const clocks = new Map<number, Clock>();

function clockFor(intervalMs: number): Clock {
  let clock = clocks.get(intervalMs);
  if (clock) return clock;
  const c: Clock = {
    listeners: new Set(),
    timer: null,
    current: 0,
    subscribe(cb) {
      c.listeners.add(cb);
      if (!c.timer) {
        c.current = Date.now();
        c.timer = setInterval(() => {
          c.current = Date.now();
          c.listeners.forEach((l) => l());
        }, intervalMs);
      }
      return () => {
        c.listeners.delete(cb);
        if (c.listeners.size === 0 && c.timer) {
          clearInterval(c.timer);
          c.timer = null;
        }
      };
    },
    getSnapshot: () => c.current || (c.current = Date.now()),
  };
  clocks.set(intervalMs, c);
  clock = c;
  return clock;
}

const getServerSnapshot = () => null;

/**
 * Current time in ms. Returns `null` during server rendering and hydration so
 * time-based UI never causes hydration mismatches.
 *
 * Ticks every second by default (countdowns). Pass a longer interval, e.g.
 * `useNow(60_000)`, for "5m ago" labels and status checks: re-rendering whole
 * lists or maps every second is a major source of lag.
 */
export function useNow(intervalMs = 1000): number | null {
  const clock = clockFor(intervalMs);
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot, getServerSnapshot);
}

/** Minute-resolution clock for relative times and overdue checks. */
export const useMinuteNow = () => useNow(60_000);
