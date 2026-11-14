"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Construction, FileWarning, TrainFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { LRT_STATIONS } from "@/lib/mock-data";

const LINE_1 = "Stay updated on ";
const LINE_2 = "Mutiara Line";
const FULL = LINE_1 + LINE_2;

function useTypewriter(text: string, speed = 65) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return count;
}

export function Hero() {
  const count = useTypewriter(FULL);
  const typed1 = FULL.slice(0, Math.min(count, LINE_1.length));
  const typed2 = count > LINE_1.length ? FULL.slice(LINE_1.length, count) : "";
  const done = count >= FULL.length;

  const roadblocks = useStore((s) => s.roadblocks);
  const active = roadblocks.filter((r) => r.status === "active").length;
  const reports = useStore((s) => s.reports.length);

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 px-6 py-10 text-white shadow-xl shadow-blue-900/20 sm:px-10 sm:py-14">
      {/* decorative LRT viaduct line */}
      <svg aria-hidden viewBox="0 0 600 200" className="absolute -right-10 bottom-0 h-56 w-[36rem] opacity-25">
        <path d="M0 160 C 120 140, 180 60, 300 80 S 480 160, 600 40" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeDasharray="1 18" />
        <path d="M0 170 C 120 150, 180 70, 300 90 S 480 170, 600 50" fill="none" stroke="white" strokeWidth="2" />
        {[60, 170, 300, 430, 540].map((x, i) => (
          <circle key={x} cx={x} cy={[156, 104, 86, 128, 72][i]} r="9" fill="white" />
        ))}
      </svg>
      <div className="absolute -top-24 -left-16 size-72 rounded-full bg-blue-400/30 blur-3xl" />

      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/25 backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          Live construction tracker · Penang
        </span>

        <h1 className="mt-5 min-h-[2.4em] max-w-xl text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl" aria-label={FULL}>
          <span aria-hidden>
            {typed1}
            {typed1.length === LINE_1.length && <br className="sm:hidden" />}
            <span className="bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent">{typed2}</span>
            <span className={`ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] rounded bg-sky-200 ${done ? "animate-caret" : ""}`} />
          </span>
        </h1>

        <p className="mt-4 max-w-lg text-blue-100/90">
          Real-time road closures, construction phases and smart detours along the {LRT_STATIONS.length}-station
          Mutiara LRT line, from Penang Sentral and KOMTAR to Bayan Lepas.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg" className="h-11 rounded-full bg-white px-5 text-blue-800 hover:bg-blue-50">
            <Link href="/map">
              Open live map <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="h-11 rounded-full px-5 text-white ring-1 ring-white/40 hover:bg-white/10 hover:text-white">
            <Link href="/reports">Report an issue</Link>
          </Button>
        </div>

        <dl className="mt-8 grid max-w-md grid-cols-3 gap-3">
          {[
            { label: "Active closures", value: active, Icon: Construction },
            { label: "Stations", value: LRT_STATIONS.length, Icon: TrainFront },
            { label: "Citizen reports", value: reports, Icon: FileWarning },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
              <Icon className="size-4 text-sky-200" />
              <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
              <dt className="text-xs text-blue-100/85">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
