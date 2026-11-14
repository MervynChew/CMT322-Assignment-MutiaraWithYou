"use client";

import Link from "next/link";
import { BellRing, ChevronRight, LogIn, MapPin, Plus, Radar, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AREAS } from "@/lib/mock-data";
import { useCurrentUser, useStore } from "@/store/useStore";

function Shell({ action, children }: { action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <BellRing className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">Your subscribed locations</h2>
            <p className="text-sm text-slate-500">Alerts when closures change in these areas</p>
          </div>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const notice = "flex flex-col items-start gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between";

export function Subscriptions() {
  const role = useStore((s) => s.role);
  const roadblocks = useStore((s) => s.roadblocks);
  const setNotification = useStore((s) => s.setNotification);
  const user = useCurrentUser();

  if (role === "guest") {
    return (
      <Shell>
        <div className={notice}>
          <p className="text-sm text-slate-600">Sign in to follow areas and get alerts when their closures change.</p>
          <Button asChild size="sm" className="rounded-full bg-blue-700 hover:bg-blue-800">
            <Link href="/sign-in">
              <LogIn /> Sign in
            </Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const manage = (
    <Button asChild variant="outline" size="sm" className="rounded-full">
      <Link href="/profile">
        <Settings2 /> Manage
      </Link>
    </Button>
  );

  if (!user.notifications.smartLocation) {
    return (
      <Shell action={manage}>
        <div className={notice}>
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Radar className="size-4 shrink-0 text-slate-400" /> Smart location alerts are off.
          </p>
          <Button size="sm" className="rounded-full bg-blue-700 hover:bg-blue-800" onClick={() => setNotification("smartLocation", true)}>
            Turn on
          </Button>
        </div>
      </Shell>
    );
  }

  const subscribed = AREAS.filter((a) => user.subscriptions.includes(a.id));

  return (
    <Shell action={manage}>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {subscribed.map((area) => {
          const count = roadblocks.filter((r) => r.areaId === area.id && r.status === "active").length;
          return (
            <li key={area.id}>
              <Link
                href={`/map?area=${area.id}`}
                className="group flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3 transition-colors hover:bg-blue-50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                  <MapPin className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate leading-tight font-medium text-slate-900">{area.name}</span>
                  <span className={cn("block text-[13px]", count ? "text-amber-700" : "text-slate-500")}>
                    {count === 0 ? "No active closures" : `${count} active closure${count > 1 ? "s" : ""}`}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/profile"
            className="flex h-full min-h-16 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-3 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-700"
          >
            <Plus className="size-4" /> {subscribed.length ? "Add area" : "Choose areas to follow"}
          </Link>
        </li>
      </ul>
    </Shell>
  );
}
