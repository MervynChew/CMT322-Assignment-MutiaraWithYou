"use client";

import { Fragment, memo, useMemo } from "react";
import { Circle, Marker, Polyline, Tooltip, ZoomControl } from "react-leaflet";
import type { RouteSuggestion } from "@/lib/geo";
import { isOverdue } from "@/lib/time";
import type { LatLng, Roadblock } from "@/lib/types";
import { BaseLayers, FocusController, PENANG_CENTER, type MapFocus } from "./base-layers";
import { placeIcon, roadblockIcon, stopIcon } from "./pins";
import { SegmentLines } from "./segment-lines";
import { StableMap } from "./stable-map";
import { effectiveModes, modesLabel } from "@/components/shared/travel-modes";

/** A place opened from a link (a followed area or a station), marked so it's easy to spot. */
export type MapHighlight = LatLng & { label: string; kind: "area" | "station"; radiusM: number };

export type LiveMapProps = {
  roadblocks: Roadblock[];
  stops: (LatLng & { name: string })[];
  routes: RouteSuggestion[];
  selectedRouteId: string | null;
  selectedRoadblockId: string | null;
  focus: MapFocus | null;
  highlight: MapHighlight | null;
  panelOpen: boolean;
  now: number | null;
  onRoadblockClick: (id: string) => void;
  onRouteClick: (id: string) => void;
};

/** Memoized: the map only re-renders when its data or selection actually changes. */
function LiveMap({
  roadblocks,
  stops,
  routes,
  selectedRouteId,
  selectedRoadblockId,
  focus,
  highlight,
  panelOpen,
  now,
  onRoadblockClick,
  onRouteClick,
}: LiveMapProps) {
  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const obstacleIds = new Set(selectedRoute?.obstacles.map((o) => o.id));
  const selected = roadblocks.find((r) => r.id === selectedRoadblockId);
  const highlightIcon = useMemo(() => (highlight ? placeIcon(highlight.label, highlight.kind) : null), [highlight]);

  return (
    <StableMap center={PENANG_CENTER} zoom={13} className="size-full">
      <BaseLayers />
      <ZoomControl position="bottomleft" />
      <FocusController focus={focus} padRight={panelOpen ? 440 : 0} />

      {highlight && highlightIcon && (
        <>
          <Circle
            center={[highlight.lat, highlight.lng]}
            radius={highlight.radiusM}
            interactive={false}
            pathOptions={{ color: "#0284c7", weight: 2, fillColor: "#38bdf8", fillOpacity: 0.1, dashArray: "6 8" }}
          />
          <Marker position={[highlight.lat, highlight.lng]} icon={highlightIcon} interactive={false} zIndexOffset={1500} />
        </>
      )}

      {/* Unselected routes first so the selected one paints on top */}
      {[...routes]
        .sort((a, b) => (a.id === selectedRouteId ? 1 : b.id === selectedRouteId ? -1 : 0))
        .map((r) => {
          const isSelected = r.id === selectedRouteId;
          const positions = r.path.map((p) => [p.lat, p.lng] as [number, number]);
          return (
            <Fragment key={r.id}>
              {isSelected && <Polyline positions={positions} pathOptions={{ color: "#ffffff", weight: 11, opacity: 1 }} />}
              <Polyline
                positions={positions}
                pathOptions={{
                  color: isSelected ? (r.obstacles.length ? "#2563eb" : "#059669") : "#64748b",
                  weight: isSelected ? 6 : 5,
                  opacity: isSelected ? 1 : 0.55,
                  dashArray: isSelected ? undefined : "8 10",
                }}
                eventHandlers={{ click: () => onRouteClick(r.id) }}
              >
                <Tooltip sticky>
                  {r.tag} · {r.durationMin} min · {r.obstacles.length} roadblock{r.obstacles.length === 1 ? "" : "s"} on the way
                </Tooltip>
              </Polyline>
            </Fragment>
          );
        })}

      {/* The open roadblock's blocked zone (what counts when nothing is drawn on the road) */}
      {selected && !selected.segments?.length && (
        <Circle
          center={[selected.lat, selected.lng]}
          radius={selected.radiusM}
          interactive={false}
          pathOptions={{ color: "#dc2626", weight: 2, fillColor: "#ef4444", fillOpacity: 0.1, dashArray: "4 6" }}
        />
      )}

      {/* Drawn closure stretches under the pins */}
      {roadblocks.map((rb) => (
        <SegmentLines key={`seg-${rb.id}`} roadblock={rb} emphasis={rb.id === selectedRoadblockId} onClick={onRoadblockClick} />
      ))}

      {roadblocks.map((rb) => {
        const overdue = now !== null && isOverdue(rb, now);
        const flagged = obstacleIds.has(rb.id);
        return (
          <Fragment key={rb.id}>
            {flagged && !rb.segments?.length && (
              <Circle
                center={[rb.lat, rb.lng]}
                radius={rb.radiusM}
                pathOptions={{ color: "#dc2626", weight: 2, fillColor: "#dc2626", fillOpacity: 0.12, dashArray: "4 6" }}
              />
            )}
            <Marker
              position={[rb.lat, rb.lng]}
              icon={roadblockIcon(rb, { selected: rb.id === selectedRoadblockId || flagged, overdue })}
              eventHandlers={{ click: () => onRoadblockClick(rb.id) }}
              zIndexOffset={rb.id === selectedRoadblockId ? 1000 : 0}
            >
              <Tooltip direction="top" offset={[0, -18]}>
                <span className="font-semibold">{rb.road}</span>
                <br />
                {rb.closure === "full" ? "Full closure" : "Partial closure"} · blocks {modesLabel(effectiveModes(rb)).toLowerCase()}
              </Tooltip>
            </Marker>
          </Fragment>
        );
      })}

      {stops.map((s, i) => (
        <Marker
          key={`${s.name}-${i}`}
          position={[s.lat, s.lng]}
          icon={stopIcon(String.fromCharCode(65 + i), i === 0 ? "origin" : i === stops.length - 1 ? "destination" : "via")}
          zIndexOffset={2000}
        >
          <Tooltip direction="top" offset={[0, -36]}>{s.name}</Tooltip>
        </Marker>
      ))}
    </StableMap>
  );
}

export default memo(LiveMap);
