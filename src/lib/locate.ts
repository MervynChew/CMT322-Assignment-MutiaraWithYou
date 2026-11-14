import { haversine } from "./geo";
import { PLACES } from "./mock-data";
import type { LatLng } from "./types";

export type DeviceFix = LatLng & { accuracy: number };

export class LocateError extends Error {
  constructor(
    public code: "unsupported" | "denied" | "unavailable" | "timeout",
    message: string,
  ) {
    super(message);
  }
}

/** Reads the device's real position through the browser Geolocation API. */
export function getDevicePosition(): Promise<DeviceFix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new LocateError("unsupported", "This browser can't share its location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) =>
        reject(
          e.code === e.PERMISSION_DENIED
            ? new LocateError("denied", "Location access is blocked. Allow it in your browser's site settings, then try again.")
            : e.code === e.TIMEOUT
              ? new LocateError("timeout", "Finding your location took too long. Try again.")
              : new LocateError("unavailable", "Your location isn't available right now."),
        ),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  });
}

/** True when the browser already allows location access (so we can locate without prompting). */
export async function locationAlreadyGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    return status?.state === "granted";
  } catch {
    return false;
  }
}

type NominatimAddress = Partial<
  Record<"road" | "neighbourhood" | "suburb" | "quarter" | "village" | "town" | "city" | "county" | "state", string>
>;

/**
 * Short, human-readable name for a coordinate: street and district from
 * OpenStreetMap's reverse geocoder, else the nearest known place, else the
 * coordinates themselves.
 */
export async function describePlace(at: LatLng): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&lat=${at.lat.toFixed(5)}&lon=${at.lng.toFixed(5)}`,
      { signal: AbortSignal.timeout(6000), headers: { "Accept-Language": "en" } },
    );
    if (res.ok) {
      const a = ((await res.json()) as { address?: NominatimAddress }).address ?? {};
      const district = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.village ?? a.town;
      const city = a.city ?? a.county ?? a.state;
      const parts = [a.road, district, city].filter((x, i, all): x is string => !!x && all.indexOf(x) === i);
      if (parts.length) return parts.slice(0, 3).join(", ");
    }
  } catch {
    // Offline or rate-limited: fall through to a local description.
  }
  const nearest = PLACES.reduce((best, p) => (haversine(at, p) < haversine(at, best) ? p : best), PLACES[0]);
  if (haversine(at, nearest) < 3000) return `Near ${nearest.name}, ${nearest.area}`;
  return `${Math.abs(at.lat).toFixed(4)}° ${at.lat >= 0 ? "N" : "S"}, ${Math.abs(at.lng).toFixed(4)}° ${at.lng >= 0 ? "E" : "W"}`;
}
