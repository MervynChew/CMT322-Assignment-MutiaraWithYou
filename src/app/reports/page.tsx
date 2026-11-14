import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportsView } from "@/components/modules/user/reports-view";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-24 pb-20 sm:px-6">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold tracking-widest text-blue-700 uppercase">Citizen reports</p>
        <h1 className="text-3xl font-bold tracking-tight">Help keep closure data accurate</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
          File a report when a closure on the map doesn&apos;t match what you see on the road. You must be within 1 km of the site.
        </p>
      </div>
      <Suspense>
        <ReportsView />
      </Suspense>
    </main>
  );
}
