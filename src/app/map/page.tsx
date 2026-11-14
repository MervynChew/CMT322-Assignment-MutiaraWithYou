import type { Metadata } from "next";
import { Suspense } from "react";
import { MapExplorer, MapSkeleton } from "@/components/modules/map/map-explorer";

export const metadata: Metadata = { title: "Live Map & Route Checker" };

export default function MapPage() {
  return (
    <main className="h-dvh">
      {/* useSearchParams (deep links like ?roadblock=rb-02) needs a Suspense boundary */}
      <Suspense fallback={<MapSkeleton />}>
        <MapExplorer />
      </Suspense>
    </main>
  );
}
