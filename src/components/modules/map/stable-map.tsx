"use client";

// Client-only. Replacement for react-leaflet's <MapContainer> that survives
// Next.js route preservation: with Cache Components, pages are hidden with
// React <Activity> instead of unmounted, so effects clean up while the DOM
// stays. MapContainer then reuses a destroyed map / its old container, which
// throws "Map container is being reused" and appendChild errors.
//
// Here every (re)mount creates a brand-new container element and map, and the
// children are keyed to that map so their layers are rebuilt from scratch.
import "leaflet/dist/leaflet.css";
import "./leaflet-fixes";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { createLeafletContext, LeafletContext, type LeafletContextInterface } from "@react-leaflet/core";

let mapSeq = 0;

export function StableMap({
  center,
  zoom,
  className,
  children,
}: {
  center: [number, number];
  zoom: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ id: number; ctx: LeafletContextInterface } | null>(null);
  // Remember the last view so hiding and showing the page keeps the user's position.
  const viewRef = useRef<{ center: L.LatLngExpression; zoom: number }>({ center, zoom });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.inset = "0";
    host.appendChild(el);

    const map = L.map(el, {
      center: viewRef.current.center,
      zoom: viewRef.current.zoom,
      zoomControl: false,
      scrollWheelZoom: true,
      // Draw closure lines and routes on one canvas instead of many SVG nodes: far smoother panning.
      preferCanvas: true,
    });
    const remember = () => (viewRef.current = { center: map.getCenter(), zoom: map.getZoom() });
    map.on("moveend", remember);
    // The container may have just become visible again; re-measure once laid out.
    const t = setTimeout(() => map.invalidateSize(), 0);

    // Syncing React with an external system (the Leaflet instance) is what effects are for.
    setState({ id: ++mapSeq, ctx: createLeafletContext(map) });

    return () => {
      clearTimeout(t);
      map.off("moveend", remember);
      map.remove();
      el.remove();
      setState(null);
    };
  }, []);

  return (
    // isolation keeps Leaflet's internal z-indexes (up to 1000) from covering the navbar and dialogs.
    <div ref={hostRef} className={className} style={{ position: "relative", isolation: "isolate" }}>
      {state && (
        <LeafletContext.Provider key={state.id} value={state.ctx}>
          {children}
        </LeafletContext.Provider>
      )}
    </div>
  );
}
