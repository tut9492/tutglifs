"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { noLabels } from "protomaps-themes-base";
import "maplibre-gl/dist/maplibre-gl.css";
import { CATEGORIES } from "@/data/categories";

const THEME = "white";
const PMTILES_URL = "pmtiles:///map/nyc.pmtiles";

type Glif = {
  id: number;
  src: string;
  gif: string;
  lng: number;
  lat: number;
  categories: string[];
  tags: string[];
};

type MarkerRec = { el: HTMLDivElement; primary: string | null };

export default function GlifMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<MarkerRec[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  // Mount: init map + static markers once.
  useEffect(() => {
    if (!containerRef.current) return;
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
        sources: {
          protomaps: {
            type: "vector",
            url: PMTILES_URL,
            attribution:
              '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
          },
        },
        layers: noLabels("protomaps", THEME),
      },
      center: [-73.971, 40.753],
      zoom: 11.4,
      maxZoom: 18,
      minZoom: 9,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", async () => {
      const glifs: Glif[] = await fetch("/glifs.json").then((r) => r.json());

      const c: Record<string, number> = {};
      for (const g of glifs) {
        const p = g.categories[0];
        if (p) c[p] = (c[p] || 0) + 1;
      }
      setCounts(c);

      for (const g of glifs) {
        const el = document.createElement("div");
        el.className = "glif-marker";
        const img = document.createElement("img");
        img.src = g.src; // static thumbnail
        img.alt = `glif #${g.id}`;
        img.loading = "lazy";
        img.decoding = "async";
        el.appendChild(img);
        el.title = `#${g.id}${g.categories[0] ? " · " + g.categories[0] : ""}`;
        new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([g.lng, g.lat])
          .addTo(map);
        markersRef.current.push({ el, primary: g.categories[0] ?? null });
      }
      setReady(true);
    });

    return () => {
      markersRef.current = [];
      map.remove();
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  // Filter in place — no movement, no camera change. Just show/hide.
  useEffect(() => {
    if (!ready) return;
    const active = selected.size > 0;
    for (const { el, primary } of markersRef.current) {
      const show = !active || (!!primary && selected.has(primary));
      el.style.display = show ? "" : "none";
    }
  }, [selected, ready]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <>
      <div ref={containerRef} className="glif-map" />
      <nav className="tg-cats" aria-label="glif categories">
        {CATEGORIES.map((c) => {
          const on = selected.has(c.id);
          return (
            <button
              key={c.id}
              className={`tg-chip${on ? " is-on" : ""}`}
              style={on ? { borderColor: c.color, background: c.color } : undefined}
              onClick={() => toggle(c.id)}
              title={`${c.label} → ${c.hood}`}
            >
              <span className="tg-dot" style={{ background: c.color }} />
              {c.label}
              <span className="tg-count">{counts[c.id] ?? ""}</span>
            </button>
          );
        })}
        {selected.size > 0 && (
          <button className="tg-chip tg-clear" onClick={() => setSelected(new Set())}>
            clear
          </button>
        )}
      </nav>
    </>
  );
}
