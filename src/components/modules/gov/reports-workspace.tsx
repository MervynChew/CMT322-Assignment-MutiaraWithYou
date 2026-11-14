"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FileText, Hourglass, Star } from "lucide-react";
import { useStore } from "@/store/useStore";
import { AdminPageHeader, HeaderStat } from "./admin-shell";
import { ReportReviewDetail } from "./report-review-detail";
import { ReportReviewTable } from "./report-review-table";

export function ReportsWorkspace() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const reports = useStore((s) => s.reports);
  const setReportViewed = useStore((s) => s.setReportViewed);
  const ticket = params.get("ticket");

  const orderedIds = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => r.id);
  const pending = reports.filter((r) => !r.viewed).length;
  const focused = reports.filter((r) => r.focused).length;

  /** Opening a report counts as the admin viewing it. */
  function open(id: string) {
    const r = reports.find((x) => x.id === id);
    if (r && !r.viewed) {
      setReportViewed(id, true);
      toast(`${id} marked as viewed`, {
        action: { label: "Undo", onClick: () => setReportViewed(id, false) },
      });
    }
    router.push(`${pathname}?ticket=${id}`, { scroll: true });
  }

  if (ticket) {
    return (
      <>
        <AdminPageHeader eyebrow="Reports" title={`Report ${ticket}`} description="The summary, and the form as it was sent." />
        <ReportReviewDetail reportId={ticket} orderedIds={orderedIds} onOpen={open} onBack={() => router.push(pathname)} />
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Reports"
        title="Citizen reports"
        description="Roadblock issues sent in by the public."
        stats={
          <>
            <HeaderStat icon={FileText} value={reports.length} label="reports" />
            <HeaderStat icon={Hourglass} value={pending} label="pending review" tone="bg-amber-400 text-amber-950" />
            <HeaderStat icon={Star} value={focused} label="in focus" tone="bg-amber-200 text-amber-900" />
          </>
        }
      />
      <ReportReviewTable onOpen={open} />
    </>
  );
}
