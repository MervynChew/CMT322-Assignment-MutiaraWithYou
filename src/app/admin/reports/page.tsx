import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportsWorkspace } from "@/components/modules/gov/reports-workspace";

// Gated on the client-side admin role (see admin/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export const metadata: Metadata = { title: "Reports" };

export default function AdminReportsPage() {
  return (
    // ?ticket=RPT-xxxx deep links use useSearchParams, which needs a Suspense boundary.
    <Suspense>
      <ReportsWorkspace />
    </Suspense>
  );
}
