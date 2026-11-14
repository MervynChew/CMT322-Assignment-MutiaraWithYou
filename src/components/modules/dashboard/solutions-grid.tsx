import Link from "next/link";
import { ArrowUpRight, BellRing, FileWarning, Map, Route } from "lucide-react";

const SOLUTIONS = [
  {
    href: "/map",
    title: "Live Closure Map",
    body: "Every LRT work zone, pinned with closure type, hours and phase.",
    Icon: Map,
    tint: "from-blue-500 to-blue-700",
  },
  {
    href: "/map?mode=route",
    title: "Route Checker",
    body: "Compare 3 routes and see which ones cross construction zones.",
    Icon: Route,
    tint: "from-sky-500 to-blue-600",
  },
  {
    href: "/reports",
    title: "Citizen Reports",
    body: "Spotted something wrong? File a report and track its review.",
    Icon: FileWarning,
    tint: "from-amber-500 to-orange-600",
  },
  {
    href: "/profile",
    title: "Smart Alerts",
    body: "Subscribe to areas like Bayan Baru and get notified first.",
    Icon: BellRing,
    tint: "from-indigo-500 to-blue-700",
  },
];

export function SolutionsGrid() {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-blue-700 uppercase">Our solutions</p>
          <h2 className="text-2xl font-bold tracking-tight">Everything you need on the move</h2>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {SOLUTIONS.map(({ href, title, body, Icon, tint }) => (
          <Link
            key={title}
            href={href}
            className={`group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/10`}
          >
            <div className="absolute -top-10 -right-10 size-32 rounded-full bg-blue-50 transition-transform duration-500 group-hover:scale-150" />
            <div className="relative">
              <div className={`flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br ${tint} text-white shadow-lg`}>
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 flex items-center gap-1 font-semibold">
                {title}
                <ArrowUpRight className="size-4 text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-700" />
              </h3>
              <p className="mt-1 text-sm text-slate-500">{body}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
