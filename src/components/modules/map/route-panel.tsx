"use client";

import { ChevronRight, CircleCheck, Clock, Route as RouteIcon, Ruler, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlideOver } from "@/components/shared/slide-over";
import { formatDistance, type RouteSuggestion } from "@/lib/geo";
import type { LatLng } from "@/lib/types";

export function RoutePanel({
  open,
  onClose,
  stops,
  routes,
  selectedRouteId,
  onSelectRoute,
  onSelectObstacle,
}: {
  open: boolean;
  onClose: () => void;
  stops: (LatLng & { name: string })[];
  routes: RouteSuggestion[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  onSelectObstacle: (id: string) => void;
}) {
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const vias = stops.slice(1, -1);

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Suggested routes"
      subtitle={`${routes.length} options · roadblocks on each route highlighted`}
      icon={
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-800">
          <RouteIcon className="size-5" />
        </span>
      }
    >
      <div className="space-y-4 p-5">
        {/* Origin → destination timeline */}
        {origin && destination && (
          <ol className="relative space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
            <span aria-hidden className="absolute top-7 bottom-7 left-[1.45rem] w-0.5 bg-gradient-to-b from-blue-700 to-slate-900" />
            {[
              { label: "Origin", place: origin, dot: "bg-blue-700" },
              ...vias.map((v) => ({ label: "Via", place: v, dot: "bg-blue-400" })),
              { label: "Destination", place: destination, dot: "bg-slate-900" },
            ].map(({ label, place, dot }, i) => (
              <li key={`${place.name}-${i}`} className="relative flex items-center gap-3">
                <span className={cn("relative z-10 size-3 rounded-full ring-4 ring-slate-50", dot)} />
                <div>
                  <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</p>
                  <p className="font-medium">{place.name}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {routes.map((r) => {
          const selected = r.id === selectedRouteId;
          const clear = r.obstacles.length === 0;
          return (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectRoute(r.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectRoute(r.id)}
              className={cn(
                "cursor-pointer rounded-2xl border-2 p-4 transition-all",
                selected ? "border-blue-600 bg-blue-50/60 shadow-lg shadow-blue-900/10" : "border-slate-100 bg-white hover:border-slate-200",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      r.tag === "Fastest" ? "bg-blue-700 text-white" : r.tag === "Fewest closures" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {r.tag}
                  </span>
                  <p className="mt-1.5 font-semibold">{r.label}</p>
                </div>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-1 text-xl font-bold tabular-nums">
                    <Clock className="size-4 text-slate-400" /> {r.durationMin}
                    <span className="text-sm font-medium text-slate-500">min</span>
                  </p>
                  <p className="flex items-center justify-end gap-1 text-xs text-slate-500">
                    <Ruler className="size-3" /> {formatDistance(r.distanceM)}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium",
                  clear ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700",
                )}
              >
                {clear ? <CircleCheck className="size-4" /> : <TriangleAlert className="size-4" />}
                {clear ? "No roadblocks on this route" : `Passes ${r.obstacles.length} roadblock${r.obstacles.length > 1 ? "s" : ""}`}
              </div>

              {!clear && (
                <ul className="mt-2 space-y-1">
                  {r.obstacles.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectObstacle(o.id);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs text-slate-600 hover:bg-white"
                      >
                        <span className={cn("size-2 rounded-full", o.closure === "full" ? "bg-red-600" : "bg-amber-500")} />
                        {o.road}
                        <span className="ml-auto text-slate-400">{o.closure === "full" ? "Full" : "Partial"}</span>
                        <ChevronRight className="size-3 text-slate-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Horizontal swipeable list of roads used */}
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium tracking-wider text-slate-400 uppercase">Roads used</p>
                <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory items-center gap-1.5 overflow-x-auto px-4 pb-1">
                  {r.roads.map((road, i) => {
                    const blocked = r.obstacles.some((o) => o.road === road);
                    return (
                      <div key={road} className="flex shrink-0 snap-start items-center gap-1.5">
                        {i > 0 && <ChevronRight className="size-3 shrink-0 text-slate-300" />}
                        <span
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap",
                            blocked ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-700",
                          )}
                        >
                          {blocked && <TriangleAlert className="mr-1 inline size-3" />}
                          {road}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SlideOver>
  );
}
