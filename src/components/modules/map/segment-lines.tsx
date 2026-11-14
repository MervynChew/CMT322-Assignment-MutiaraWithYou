"use client";

// Client-only (react-leaflet): draws a roadblock's closed stretches of road.
import { Fragment, memo, useMemo } from "react";
import { Polyline, Tooltip } from "react-leaflet";
import { formatDistance } from "@/lib/geo";
import type { ClosureSegment, Roadblock } from "@/lib/types";
import { modesLabel, segmentModes } from "@/components/shared/travel-modes";

export function segmentColor(rb: Roadblock, seg: ClosureSegment): string {
  if (rb.status === "completed") return "#10b981";
  if (rb.status === "scheduled") return "#64748b";
  return seg.kind === "full" ? "#dc2626" : "#f59e0b";
}

export const segmentLabel = (seg: ClosureSegment) => (seg.kind === "full" ? "Full block" : "Partial block");

/**
 * Full blocks: solid red with a white centre dash (barrier look).
 * Partial blocks: amber dashes (one lane open).
 *
 * Memoized, and positions are computed once per segment list: react-leaflet
 * calls setLatLngs() whenever it receives a new positions array, so rebuilding
 * them on every parent render made the map redraw constantly.
 */
export const SegmentLines = memo(function SegmentLines({
  roadblock,
  segments = roadblock.segments ?? [],
  emphasis = false,
  dim = false,
  onClick,
}: {
  roadblock: Roadblock;
  segments?: ClosureSegment[];
  emphasis?: boolean;
  dim?: boolean;
  onClick?: (roadblockId: string) => void;
}) {
  const w = emphasis ? 8 : 6;
  const alpha = dim ? 0.45 : 1;
  const paths = useMemo(() => segments.map((seg) => seg.path.map((p) => [p.lat, p.lng] as [number, number])), [segments]);
  return segments.map((seg, i) => {
    const positions = paths[i];
    const color = segmentColor(roadblock, seg);
    const full = seg.kind === "full";
    return (
      <Fragment key={seg.id}>
        <Polyline
          positions={positions}
          interactive={false}
          pathOptions={{ color: "#ffffff", weight: w + 5, opacity: 0.95 * alpha, lineCap: "round", lineJoin: "round" }}
        />
        <Polyline
          positions={positions}
          pathOptions={{
            color,
            weight: w,
            opacity: alpha,
            lineCap: full ? "round" : "butt",
            lineJoin: "round",
            dashArray: full ? undefined : "11 7",
          }}
          eventHandlers={onClick ? { click: () => onClick(roadblock.id) } : undefined}
        >
          <Tooltip sticky>
            <span className="font-semibold">{segmentLabel(seg)}</span> · {seg.road} · {formatDistance(seg.lengthM)}
            <br />
            <span className="text-slate-600">Blocks {modesLabel(segmentModes(roadblock, seg)).toLowerCase()}</span>
            {seg.road !== roadblock.road && roadblock.road && (
              <>
                <br />
                <span className="text-slate-500">Part of {roadblock.road}</span>
              </>
            )}
          </Tooltip>
        </Polyline>
        {full && (
          <Polyline
            positions={positions}
            interactive={false}
            pathOptions={{ color: "#ffffff", weight: 2, opacity: 0.9 * alpha, dashArray: "3 9", lineCap: "round" }}
          />
        )}
      </Fragment>
    );
  });
});
