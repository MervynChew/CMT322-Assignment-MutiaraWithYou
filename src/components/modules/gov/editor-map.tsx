"use client";

// Client-only (loaded with next/dynamic ssr:false): interactive admin canvas.
import { useEffect, useState } from "react";
import { Circle, CircleMarker, Marker, Polyline, Tooltip, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import type { ArchivedRoadblock, ClosureType, LatLng, PendingChange, Roadblock } from "@/lib/types";
import { BaseLayers, FocusController, PENANG_CENTER, SizeInvalidator, type MapFocus } from "@/components/modules/map/base-layers";
import { roadblockIcon } from "@/components/modules/map/pins";
import { SegmentLines } from "@/components/modules/map/segment-lines";
import { StableMap } from "@/components/modules/map/stable-map";
import { cn } from "@/lib/utils";
import { haversine } from "@/lib/geo";
import { formatShortDate } from "@/lib/time";
import { takesDown } from "@/store/useStore";

/** `completed`: finished works still on the public map. `past`: roadblocks taken off it (Past roadblocks). */
export type EditorLayers = { line: boolean; stations: boolean; completed: boolean; past: boolean };

/** In-progress drawing shown on the canvas. */
export type DrawPreview = {
  kind: ClosureType;
  /** Road-snapped vertices the admin clicked. */
  points: LatLng[];
  /** Road-following path through those vertices. */
  path: LatLng[];
  busy: boolean;
};

/** Brief marker where a click was rejected (e.g. not on a road). */
export type RejectFlash = { at: LatLng; key: number };

export type EditorMapProps = {
  roadblocks: Roadblock[];
  pending: PendingChange[];
  /** Past roadblocks, shown in grey when the layer is on (not draggable; clicking opens them to restore). */
  archived: ArchivedRoadblock[];
  placing: boolean;
  selectedId: string | null;
  focus: MapFocus | null;
  layers: EditorLayers;
  sizeToken: unknown;
  padRight: number;
  now: number | null;
  drawing: DrawPreview | null;
  reject: RejectFlash | null;
  onMapClick: (at: LatLng) => void;
  onSelect: (id: string) => void;
  onMove: (id: string, at: LatLng) => void;
  onFinishDraw: () => void;
};

const KIND_COLOR: Record<ClosureType, string> = { full: "#dc2626", partial: "#f59e0b" };

function ClickCatcher({ onClick, onHover }: { onClick: (at: LatLng) => void; onHover: (at: LatLng | null) => void }) {
  useMapEvents({
    click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }),
    mousemove: (e) => onHover({ lat: e.latlng.lat, lng: e.latlng.lng }),
    mouseout: () => onHover(null),
  });
  return null;
}

/** Double-click would add two points and zoom; turn zoom-on-dblclick off while drawing. */
function DrawMode({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    map.doubleClickZoom.disable();
    return () => {
      map.doubleClickZoom.enable();
    };
  }, [map, active]);
  return null;
}

export default function EditorMap({
  roadblocks,
  pending,
  archived,
  placing,
  selectedId,
  focus,
  layers,
  sizeToken,
  padRight,
  now,
  drawing,
  reject,
  onMapClick,
  onSelect,
  onMove,
  onFinishDraw,
}: EditorMapProps) {
  const [hover, setHover] = useState<LatLng | null>(null);
  const pendingById = new Map(pending.map((c) => [c.roadblock.id, c.kind]));
  // Show what's queued to come off the map faded, so admins can still see what's going.
  const leaving = pending.filter(takesDown).map((c) => c.roadblock);
  const pins = [...roadblocks, ...leaving].filter(
    (rb) => layers.completed || rb.status !== "completed" || rb.id === selectedId || pendingById.has(rb.id),
  );
  // Past roadblocks queued to come back are already among `roadblocks`.
  const past = archived.filter((a) => !pendingById.has(a.roadblock.id) && (layers.past || a.roadblock.id === selectedId));
  const selected = pins.find((r) => r.id === selectedId);
  const crosshair = placing || !!drawing;
  // While drawing, pins let clicks through so a point can be placed right next to (or under) one.
  const mapClass = cn(
    "size-full",
    crosshair && "[&_.leaflet-container]:cursor-crosshair [&_.leaflet-grab]:cursor-crosshair",
    drawing && "[&_.leaflet-marker-icon]:pointer-events-none",
  );
  const last = drawing?.points[drawing.points.length - 1];

  return (
    <StableMap
      center={PENANG_CENTER}
      zoom={13}
      className={mapClass}
    >
      <BaseLayers showLine={layers.line} showStations={layers.stations} />
      <ZoomControl position="bottomleft" />
      <SizeInvalidator token={sizeToken} />
      <FocusController focus={focus} padRight={padRight} />
      <ClickCatcher onClick={onMapClick} onHover={(p) => drawing && setHover(p)} />
      <DrawMode active={!!drawing} />

      {selected && (
        // Blocked zone around the pin. Drawings must stay inside it, so it stands out while drawing;
        // otherwise it's fainter once drawn stretches are what decide the block.
        <Circle
          center={[selected.lat, selected.lng]}
          radius={selected.radiusM}
          interactive={false}
          pathOptions={
            drawing
              ? { color: "#1d4ed8", weight: 2.5, fillColor: "#3b82f6", fillOpacity: 0.1, dashArray: "6 6" }
              : selected.segments?.length
              ? { color: "#64748b", weight: 1.5, fillColor: "#94a3b8", fillOpacity: 0.06, dashArray: "3 7" }
              : { color: "#1d4ed8", weight: 2, fillColor: "#3b82f6", fillOpacity: 0.12, dashArray: "4 6" }
          }
        />
      )}

      {/* Past roadblocks: grey, under everything live */}
      {past.map((a) => (
        <SegmentLines key={`past-seg-${a.roadblock.id}`} roadblock={a.roadblock} muted dim={!!drawing} onClick={drawing ? undefined : onSelect} />
      ))}
      {past.map((a) => (
        <Marker
          key={`past-${a.roadblock.id}`}
          position={[a.roadblock.lat, a.roadblock.lng]}
          icon={roadblockIcon(a.roadblock, { archived: true, selected: a.roadblock.id === selectedId })}
          zIndexOffset={a.roadblock.id === selectedId ? 1000 : -500}
          opacity={drawing ? 0.4 : 1}
          eventHandlers={{ click: () => !drawing && onSelect(a.roadblock.id) }}
        >
          {!drawing && (
            <Tooltip direction="top" offset={[0, -18]}>
              <span className="font-semibold">{a.roadblock.road}</span>
              <br />
              {a.reason === "done" ? "Marked done" : "Removed"} {formatShortDate(a.at)} · click to restore
            </Tooltip>
          )}
        </Marker>
      ))}

      {/* Drawn closure segments */}
      {pins.map((rb) => (
        <SegmentLines
          key={`seg-${rb.id}`}
          roadblock={rb}
          emphasis={rb.id === selectedId}
          dim={pendingById.get(rb.id) === "remove" || pendingById.get(rb.id) === "done" || (!!drawing && rb.id !== selectedId)}
          onClick={drawing ? undefined : onSelect}
        />
      ))}

      {/* In-progress drawing */}
      {drawing && (
        <>
          {drawing.path.length > 1 && (
            <>
              <Polyline positions={drawing.path.map((p) => [p.lat, p.lng])} interactive={false} pathOptions={{ color: "#ffffff", weight: 11, opacity: 0.9 }} />
              <Polyline
                positions={drawing.path.map((p) => [p.lat, p.lng])}
                interactive={false}
                pathOptions={{ color: KIND_COLOR[drawing.kind], weight: 6, dashArray: drawing.kind === "partial" ? "11 7" : undefined }}
              />
            </>
          )}
          {last && hover && !drawing.busy && (
            <Polyline
              positions={[[last.lat, last.lng], [hover.lat, hover.lng]]}
              interactive={false}
              // Red once the pointer leaves the blocked zone: a click there will be refused.
              pathOptions={{
                color: selected && haversine(hover, selected) > selected.radiusM ? "#dc2626" : "#334155",
                weight: 2,
                dashArray: "4 6",
                opacity: 0.8,
              }}
            />
          )}
          {drawing.points.map((p, i) => {
            const isLast = i === drawing.points.length - 1;
            return (
              <CircleMarker
                key={`${p.lat},${p.lng},${i}`}
                center={[p.lat, p.lng]}
                radius={isLast ? 7 : 5}
                bubblingMouseEvents={!isLast}
                pathOptions={{ color: KIND_COLOR[drawing.kind], weight: 3, fillColor: "#ffffff", fillOpacity: 1 }}
                eventHandlers={isLast && drawing.points.length > 1 ? { click: () => onFinishDraw() } : undefined}
              >
                {isLast && drawing.points.length > 1 && <Tooltip direction="top" offset={[0, -8]}>Click again to finish</Tooltip>}
              </CircleMarker>
            );
          })}
        </>
      )}

      {reject && (
        <CircleMarker
          key={reject.key}
          center={[reject.at.lat, reject.at.lng]}
          radius={9}
          interactive={false}
          pathOptions={{ color: "#e11d48", weight: 3, fillColor: "#e11d48", fillOpacity: 0.25, dashArray: "3 4" }}
        />
      )}

      {pins.map((rb) => {
        const kind = pendingById.get(rb.id);
        return (
          <Marker
            key={rb.id}
            position={[rb.lat, rb.lng]}
            draggable={kind !== "remove" && kind !== "done" && !drawing}
            icon={roadblockIcon(rb, {
              selected: rb.id === selectedId,
              pending: kind,
              overdue: now !== null && rb.status !== "completed" && new Date(rb.endDate).getTime() < now,
            })}
            zIndexOffset={rb.id === selectedId ? 1000 : 0}
            opacity={drawing && rb.id !== selectedId ? 0.5 : 1}
            eventHandlers={{
              click: () => !drawing && onSelect(rb.id),
              dragend: (e) => {
                const p = e.target.getLatLng();
                onMove(rb.id, { lat: p.lat, lng: p.lng });
              },
            }}
          >
            {!drawing && (
              <Tooltip direction="top" offset={[0, -18]}>
                <span className="font-semibold">{rb.road || "Untitled roadblock"}</span>
                <br />
                {kind === "remove" ? "Queued for removal" : kind === "done" ? "Queued to mark as done" : "Click to edit · drag to move"}
              </Tooltip>
            )}
          </Marker>
        );
      })}
    </StableMap>
  );
}
