"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArchiveRestore, Crosshair, History, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { AREAS } from "@/lib/mock-data";
import { CLOSURE_TYPES, closureTypeOf } from "@/lib/closure-type";
import { formatDate, formatPeriod } from "@/lib/time";
import type { ArchivedRoadblock } from "@/lib/types";
import { useStore } from "@/store/useStore";

type Filter = "all" | ArchivedRoadblock["reason"];

export const PAST_REASON: Record<ArchivedRoadblock["reason"], { label: string; verb: string; chip: string }> = {
  done: { label: "Done", verb: "Marked as done", chip: "bg-teal-50 text-teal-700 ring-teal-200" },
  removed: { label: "Removed", verb: "Removed", chip: "bg-rose-50 text-rose-700 ring-rose-200" },
};

/**
 * Roadblocks taken off the public map (marked done, or removed). They stay here
 * so a roadblock removed by mistake can be put back; a restore goes live on Post.
 */
export function PastRoadblocks({
  shownOnMap,
  onShownOnMapChange,
  selectedId,
  onShow,
}: {
  shownOnMap: boolean;
  onShownOnMapChange: (shown: boolean) => void;
  selectedId?: string | null;
  /** Opens the past roadblock on the canvas. */
  onShow: (past: ArchivedRoadblock) => void;
}) {
  const archive = useStore((s) => s.archive);
  const pending = useStore((s) => s.pendingChanges);
  const queueChange = useStore((s) => s.queueChange);
  const discardChange = useStore((s) => s.discardChange);
  const [filter, setFilter] = useState<Filter>("all");

  const rows = archive.filter((a) => filter === "all" || a.reason === filter);

  return (
    <Card id="past-roadblocks" className="scroll-mt-24 rounded-3xl py-0 shadow-sm ring-slate-200/70">
      <CardHeader className="border-b border-slate-100 bg-linear-to-r from-slate-50 to-white pt-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-8 items-center justify-center rounded-xl bg-slate-600 text-white">
            <History className="size-4" />
          </span>
          Past roadblocks
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">{archive.length}</span>
        </CardTitle>
        <CardDescription>Off the public map and home page. Restore one if it came off by mistake.</CardDescription>
        <CardAction>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            Show on map
            <Switch checked={shownOnMap} onCheckedChange={onShownOnMapChange} />
          </label>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 pt-4 pb-5">
        {archive.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
            Nothing here yet. Roadblocks you mark as done or remove show up here after you post.
          </p>
        ) : (
          <>
            <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as Filter)} className="rounded-full bg-slate-100 p-0.5" size="sm">
              {(["all", "done", "removed"] as const).map((f) => (
                <ToggleGroupItem
                  key={f}
                  value={f}
                  className="rounded-full px-3 text-xs data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm"
                >
                  {f === "all" ? "All" : PAST_REASON[f].label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ul className="scroll-inset max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {rows.map((a) => {
                const rb = a.roadblock;
                const reason = PAST_REASON[a.reason];
                const restoring = pending.find((c) => c.kind === "restore" && c.roadblock.id === rb.id);
                return (
                  <li
                    key={rb.id}
                    className={cn(
                      "rounded-2xl bg-white p-3 ring-1 transition-shadow",
                      rb.id === selectedId ? "shadow-md ring-2 ring-blue-400" : "ring-slate-200",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1", reason.chip)}>{reason.label}</span>
                      <p className="min-w-0 flex-1 leading-snug font-semibold text-slate-900">{rb.road}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {AREAS.find((x) => x.id === rb.areaId)?.name} · {CLOSURE_TYPES[closureTypeOf(rb)].label} · {formatPeriod(rb.startDate, rb.endDate)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {reason.verb} {formatDate(a.at)} by {a.by}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" className="h-8 rounded-full px-2.5 text-blue-700 hover:bg-blue-50" onClick={() => onShow(a)}>
                        <Crosshair /> Show on map
                      </Button>
                      {restoring ? (
                        <>
                          <span className="ml-auto text-xs font-medium text-blue-700">Restores when you post</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-full px-2.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => {
                              discardChange(restoring.id);
                              toast(`Undid: restore ${rb.road}`);
                            }}
                          >
                            <Undo2 /> Undo
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-auto h-8 rounded-full px-3"
                          onClick={() => {
                            queueChange({ kind: "restore", roadblock: rb });
                            toast.success(`Queued: restore ${rb.road}`, { description: "It goes back on the public map when you post." });
                          }}
                        >
                          <ArchiveRestore /> Restore
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
              {rows.length === 0 && <li className="p-6 text-center text-sm text-slate-500">None {filter === "done" ? "marked as done" : "removed"} yet.</li>}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
