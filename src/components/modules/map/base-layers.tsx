"use client";

// Client-only Leaflet layers shared by the public map and the admin editor.
import { useEffect } from "react";
import L from "leaflet";
import { Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { LRT_LINES, LRT_STATIONS } from "@/lib/mock-data";
import type { LatLng } from "@/lib/types";
import { stationIcon } from "./pins";

export const PENANG_CENTER: [number, number] = [5.355, 100.305];

export function BaseLayers({ showStations = true, showLine = true }: { showStations?: boolean; showLine?: boolean }) {
  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {/* Mutiara LRT: both routes, meeting at Macallum */}
      {showLine &&
        LRT_LINES.map((line, i) => (
          <LrtLine key={i} positions={line} />
        ))}
      {showStations &&
        LRT_STATIONS.map((s) => (
          <Marker key={s.code} position={[s.lat, s.lng]} icon={stationIcon} zIndexOffset={-500}>
            <Tooltip direction="top" offset={[0, -10]}>
              <span className="font-semibold">
                {s.code} {s.name}
              </span>{" "}
              · LRT station
              {s.interchange && " · Interchange"}
              {s.provisional && " · Provisional"}
            </Tooltip>
          </Marker>
        ))}
    </>
  );
}

function LrtLine({ positions }: { positions: [number, number][] }) {
  return (
    <>
      <Polyline positions={positions} interactive={false} pathOptions={{ color: "#ffffff", weight: 9, opacity: 0.9 }} />
      <Polyline positions={positions} interactive={false} pathOptions={{ color: "#1e40af", weight: 5, opacity: 0.85, dashArray: "1 10", lineCap: "round" }} />
      <Polyline positions={positions} interactive={false} pathOptions={{ color: "#1e40af", weight: 2, opacity: 0.7 }} />
    </>
  );
}

export type MapFocus =
  | { kind: "point"; at: LatLng; zoom?: number; key: string }
  | {
      kind: "bounds";
      points: LatLng[];
      key: string;
      /** Space to keep clear at the top-left, e.g. for a card floating over the map. */
      padTopLeft?: [number, number];
    };

/** Animates the map whenever `focus.key` changes (and once each time the map is shown again). */
export function FocusController({ focus, padRight = 0 }: { focus: MapFocus | null; padRight?: number }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    if (focus.kind === "point") {
      map.flyTo([focus.at.lat, focus.at.lng], focus.zoom ?? 16, { duration: 0.8 });
    } else if (focus.points.length) {
      const bounds = L.latLngBounds(focus.points.map((p) => [p.lat, p.lng] as [number, number]));
      map.flyToBounds(bounds, { paddingTopLeft: focus.padTopLeft ?? [40, 110], paddingBottomRight: [padRight + 40, 40], duration: 0.8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the focus key changes
  }, [focus?.key]);
  return null;
}

/** Tells Leaflet to re-measure its container (e.g. after toggling full-screen). */
export function SizeInvalidator({ token }: { token: unknown }) {
  const map = useMap();
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 320);
    return () => clearTimeout(id);
  }, [map, token]);
  return null;
}
