"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { describePlace, getDevicePosition, LocateError, locationAlreadyGranted } from "@/lib/locate";
import { useStore } from "@/store/useStore";
import { useStableCallback } from "./use-stable-callback";

/** Re-read the position quietly when the saved one is older than this. */
const STALE_MS = 2 * 60_000;

/**
 * The viewer's real location from their device. If the browser already allows
 * location access, it is refreshed quietly when the component opens; otherwise
 * nothing happens until the viewer asks (so no surprise permission prompts).
 */
export function useDeviceLocation() {
  const position = useStore((s) => s.position);
  const setPosition = useStore((s) => s.setPosition);
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const locate = useStableCallback(async (quiet = false) => {
    setStatus("locating");
    setError(null);
    try {
      const fix = await getDevicePosition();
      const label = await describePlace(fix);
      setPosition({ lat: fix.lat, lng: fix.lng, label, accuracy: fix.accuracy, at: new Date().toISOString() });
      setStatus("idle");
      if (!quiet) toast.success("Location updated", { description: label });
    } catch (e) {
      setStatus("error");
      setError(e instanceof LocateError ? e.message : "Couldn't read your location.");
    }
  });

  useEffect(() => {
    let cancelled = false;
    void locationAlreadyGranted().then((granted) => {
      const saved = useStore.getState().position;
      const stale = !saved || Date.now() - new Date(saved.at).getTime() > STALE_MS;
      if (granted && stale && !cancelled) void locate(true);
    });
    return () => {
      cancelled = true;
    };
  }, [locate]);

  return { position, status, error, locate };
}
