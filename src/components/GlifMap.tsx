"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { noLabels } from "protomaps-themes-base";
import "maplibre-gl/dist/maplibre-gl.css";
import { CATEGORIES } from "@/data/categories";
import { placeGlifs, type Glif, type Placed } from "@/lib/layout";

const THEME = "white";
const PMTILES_URL = "pmtiles:///map/nyc.pmtiles";
const DEFAULT_VIEW = { center: [-73.971, 40.753] as [number, number], zoom: 11.4 };

type MarkerRec = { marker: maplibregl.Marker; el: HTMLDivElement; rec: Placed };

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function GlifMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<MarkerRec[]>([]);
  const rafRef = useRef<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  // Mount: init map + markers once.
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
      center: DEFAULT_VIEW.center,
      zoom: DEFAULT_VIEW.zoom,
      maxZoom: 18,
      minZoom: 9,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", async () => {
      const glifs: Glif[] = await fetch("/glifs.json").then((r) => r.json());
      const placed = placeGlifs(glifs);

      const c: Record<string, number> = {};
      for (const g of placed) if (g.primary) c[g.primary] = (c[g.primary] || 0) + 1;
      setCounts(c);

      for (const rec of placed) {
        const el = document.createElement("div");
        el.className = "glif-marker";
        const img = document.createElement("img");
        img.src = rec.src;
        img.alt = `glif #${rec.id}`;
        img.loading = "lazy";
        el.appendChild(img);
        el.title = `#${rec.id}${rec.primary ? " · " + rec.primary : ""}`;
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat(rec.grid)
          .addTo(map);
        markersRef.current.push({ marker, el, rec });
      }
      setReady(true);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      markersRef.current.forEach((m) => m.marker.remove());
      markersRef.current = [];
      map.remove();
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  // React to selection: regroup + fade + move camera.
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;

    const active = selected.size > 0;
    type Step = { el: HTMLDivElement; marker: maplibregl.Marker; from: [number, number]; to: [number, number]; fromOp: number; toOp: number };
    const steps: Step[] = markersRef.current.map(({ marker, el, rec }) => {
      const inSel = !!rec.primary && selected.has(rec.primary);
      const to = active ? (inSel ? rec.cluster : rec.grid) : rec.grid;
      const toOp = active ? (inSel ? 1 : 0.05) : 1;
      const ll = marker.getLngLat();
      const fromOp = el.style.opacity === "" ? 1 : parseFloat(el.style.opacity);
      return { el, marker, from: [ll.lng, ll.lat], to, fromOp, toOp };
    });

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const duration = 750;
    let startT: number | null = null;
    const tick = (now: number) => {
      if (startT === null) startT = now;
      const t = Math.min(1, (now - startT) / duration);
      const e = easeOutCubic(t);
      for (const s of steps) {
        const lng = s.from[0] + (s.to[0] - s.from[0]) * e;
        const lat = s.from[1] + (s.to[1] - s.from[1]) * e;
        s.marker.setLngLat([lng, lat]);
        const op = s.fromOp + (s.toOp - s.fromOp) * e;
        s.el.style.opacity = String(op);
        s.el.style.pointerEvents = op < 0.4 ? "none" : "auto";
      }
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    // Camera
    if (active) {
      const cats = CATEGORIES.filter((c) => selected.has(c.id));
      if (cats.length === 1) {
        map.flyTo({ center: cats[0].centroid, zoom: 13.6, duration: 800 });
      } else {
        const b = new maplibregl.LngLatBounds();
        cats.forEach((c) => b.extend(c.centroid));
        map.fitBounds(b, { padding: 160, duration: 800, maxZoom: 13 });
      }
    } else {
      map.flyTo({ ...DEFAULT_VIEW, duration: 800 });
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
