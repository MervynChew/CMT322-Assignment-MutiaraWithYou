"use client";

/* eslint-disable @next/next/no-img-element -- remote mock photos, no optimisation needed */
import { useState } from "react";
import { HardHat } from "lucide-react";
import { cn } from "@/lib/utils";

/** Construction site photo with a striped fallback if the image fails to load. */
export function SiteImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-slate-200", className)}>
      {failed ? (
        <div className="construction-stripes flex size-full items-center justify-center opacity-90">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/90 shadow">
            <HardHat className="size-6 text-amber-600" />
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
    </div>
  );
}
