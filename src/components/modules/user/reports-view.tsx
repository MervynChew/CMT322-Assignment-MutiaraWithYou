"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FilePlus2, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthGate } from "@/components/shared/auth-gate";
import { ReportForm, type ReportPrefill } from "./report-form";
import { ReportHistory } from "./report-history";

/** What a link such as /reports?tab=new&roadblock=rb-02&at=… asks the page to show. */
function prefillFrom(params: { get(name: string): string | null }, key: string): ReportPrefill | null {
  const roadblockId = params.get("roadblock");
  if (!roadblockId) return null;
  return { roadblockId, observedAt: params.get("at") ?? undefined, key, from: "map" };
}

export function ReportsView() {
  const params = useSearchParams();
  const linkKey = params.toString();
  const [tab, setTab] = useState(params.get("tab") === "mine" ? "mine" : "new");
  const [prefill, setPrefill] = useState<ReportPrefill | null>(() => prefillFrom(params, linkKey));

  // The page stays mounted between visits, so follow links that arrive later too
  // (e.g. "Report inaccuracy" on the map opens a new, filled-in report).
  const [prevLinkKey, setPrevLinkKey] = useState(linkKey);
  if (linkKey !== prevLinkKey) {
    setPrevLinkKey(linkKey);
    const next = prefillFrom(params, linkKey);
    if (params.get("tab") === "mine") setTab("mine");
    else if (next || params.get("tab") === "new") setTab("new");
    if (next) setPrefill(next);
  }

  return (
    <AuthGate
      title="Sign in to report an issue"
      description="Reports are linked to your account so the operations team can follow up with you."
      perks={[
        "Report closures that don't match the road",
        "Track each report from submitted to reviewed",
        "Add updates while a report is pending review",
      ]}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <div className="mb-6 flex justify-center">
          <TabsList className="h-11 rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200">
            <TabsTrigger value="new" className="rounded-full px-5 data-active:bg-blue-700 data-active:text-white">
              <FilePlus2 /> New report
            </TabsTrigger>
            <TabsTrigger value="mine" className="rounded-full px-5 data-active:bg-blue-700 data-active:text-white">
              <History /> My reports
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="new">
          <ReportForm
            prefill={prefill}
            onSubmitted={() => {
              setTab("mine");
              setPrefill(null);
            }}
          />
        </TabsContent>
        <TabsContent value="mine">
          <ReportHistory
            onAddUpdate={(id) => {
              setPrefill({ roadblockId: id, key: `update-${id}-${Date.now()}`, from: "update" });
              setTab("new");
            }}
          />
        </TabsContent>
      </Tabs>
    </AuthGate>
  );
}
