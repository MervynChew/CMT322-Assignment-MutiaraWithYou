import Image from "next/image";
import { BellRing, FileWarning, Route } from "lucide-react";
import { AuthSwitch } from "@/components/modules/auth/auth-switch";

const PERKS = [
  { icon: Route, title: "Live closures & detours", body: "Every Mutiara Line work zone, with hours and the way around." },
  { icon: BellRing, title: "Alerts for your areas", body: "Pick the places you pass through and hear about changes first." },
  { icon: FileWarning, title: "Report what you see", body: "Flag a closure that doesn't match the road and follow its review." },
];

/** Shared frame for sign in and sign up: brand panel on the left, form on the right. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-dvh overflow-hidden px-4 pt-24 pb-16 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_10%_-10%,rgb(59_130_246/0.14),transparent),radial-gradient(40rem_24rem_at_100%_100%,rgb(30_64_175/0.10),transparent)]" />

      <div className="relative mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-blue-900/10 ring-1 ring-slate-200/70 lg:grid-cols-[1fr_1.05fr]">
        {/* Brand panel */}
        <section className="relative hidden overflow-hidden bg-linear-to-br from-blue-900 via-blue-800 to-blue-600 p-10 text-white lg:flex lg:flex-col">
          <svg aria-hidden viewBox="0 0 400 260" className="absolute -right-16 -bottom-6 w-[30rem] opacity-25">
            <path d="M0 220 C 90 200, 130 110, 210 125 S 340 210, 400 70" fill="none" stroke="white" strokeWidth="3" />
            {[[30, 214], [120, 160], [210, 125], [300, 168], [372, 104]].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="8" fill="white" />
            ))}
          </svg>
          <div aria-hidden className="absolute -top-24 -left-20 size-72 rounded-full bg-[radial-gradient(circle,rgb(96_165_250/0.45),transparent_70%)]" />

          <div className="relative flex items-center gap-3">
            <Image src="/logo/logo.png" alt="" width={48} height={48} className="size-12 rounded-2xl shadow-lg shadow-blue-950/40 ring-1 ring-white/20" />
            <div>
              <p className="text-lg leading-tight font-bold">Mutiara with you</p>
              <p className="text-xs text-blue-100/80">Penang LRT construction tracker</p>
            </div>
          </div>

          <h2 className="relative mt-12 max-w-xs text-3xl leading-tight font-bold tracking-tight">
            Your commute, one step ahead of the works.
          </h2>

          <ul className="relative mt-8 space-y-5">
            {PERKS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-sm text-blue-100/80">{body}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="relative mt-auto pt-10 text-xs text-blue-100/70">Komtar · Jelutong · Gelugor · Sungai Nibong · Bayan Lepas</p>
        </section>

        {/* Form */}
        <section className="p-6 sm:p-10">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Image src="/logo/logo.png" alt="" width={40} height={40} className="size-10 rounded-xl shadow-md shadow-blue-900/25" />
            <p className="font-bold">Mutiara with you</p>
          </div>
          <AuthSwitch />
          {children}
        </section>
      </div>
    </main>
  );
}
