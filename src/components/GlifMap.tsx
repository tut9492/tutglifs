"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { noLabels } from "protomaps-themes-base";
import "maplibre-gl/dist/maplibre-gl.css";
import { CATEGORIES } from "@/data/categories";

const THEME = "white";
const PMTILES_URL = "pmtiles:///map/nyc.pmtiles";

const COLS = 20;
const ROWS = 15; // 20 x 15 = 300
const GAP = 3; // px between glifs — constant at every zoom
const MIN_TILE = 14;
const MAX_TILE = 360;

type Glif = {
  id: number;
  src: string;
  gif: string;
  categories: string[];
  tags: string[];
};

type View = { tile: number; x: number; y: number };

export default function GlifMap() {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [glifs, setGlifs] = useState<Glif[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cols, setCols] = useState(COLS);
  const [view, setView] = useState<View>({ tile: 40, x: 0, y: 0 });
  const [hover, setHover] = useState<number | null>(null);

  // --- NYC map backdrop (full screen, non-interactive) ---
  useEffect(() => {
    if (!mapDivRef.current) return;
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    const map = new maplibregl.Map({
      container: mapDivRef.current,
      interactive: false,
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
      zoom: 11.2,
      attributionControl: { compact: true },
    });
    return () => {
      map.remove();
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  // --- load glifs ---
  useEffect(() => {
    fetch("/glifs.json")
      .then((r) => r.json())
      .then((data: Glif[]) => {
        setGlifs(data);
        const c: Record<string, number> = {};
        for (const g of data) {
          const p = g.categories[0];
          if (p) c[p] = (c[p] || 0) + 1;
        }
        setCounts(c);
      });
  }, []);

  // Fit the active layout (full table, or the bunched selection) to the screen.
  const fitLayout = useCallback((sel: Set<string>): { cols: number; view: View } => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (sel.size === 0) {
      // Full-bleed table: 20 columns span the entire screen width.
      const tile = Math.max(MIN_TILE, (vw - (COLS - 1) * GAP) / COLS);
      const gridH = ROWS * tile + (ROWS - 1) * GAP;
      return { cols: COLS, view: { tile, x: 0, y: gridH < vh ? (vh - gridH) / 2 : 56 } };
    }

    // Bunch: matching glifs gather into a compact, centered clump.
    const n = glifs.filter((g) => g.categories[0] && sel.has(g.categories[0])).length || 1;
    const bcols = Math.max(1, Math.ceil(Math.sqrt(n * 1.3)));
    const brows = Math.ceil(n / bcols);
    const padX = 60;
    const padY = 150;
    const tile = Math.max(
      MIN_TILE,
      Math.min(
        MAX_TILE,
        (vw - padX * 2 - (bcols - 1) * GAP) / bcols,
        (vh - padY * 2 - (brows - 1) * GAP) / brows
      )
    );
    const gridW = bcols * tile + (bcols - 1) * GAP;
    const gridH = brows * tile + (brows - 1) * GAP;
    return {
      cols: bcols,
      view: { tile, x: (vw - gridW) / 2, y: Math.max(96, (vh - gridH) / 2) },
    };
  }, [glifs]);

  // Re-fit whenever the selection (or data / window) changes.
  useEffect(() => {
    if (glifs.length === 0) return;
    const { cols: c, view: v } = fitLayout(selected);
    setCols(c);
    setView(v);
    const onResize = () => {
      const r = fitLayout(selected);
      setCols(r.cols);
      setView(r.view);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [selected, glifs, fitLayout]);

  // zoom about a screen point, keeping that point stable; gap stays constant
  const zoomAbout = useCallback((factor: number, px: number, py: number) => {
    setView((v) => {
      const next = Math.min(MAX_TILE, Math.max(MIN_TILE, v.tile * factor));
      if (next === v.tile) return v;
      const ux = (px - v.x) / (v.tile + GAP);
      const uy = (py - v.y) / (v.tile + GAP);
      return { tile: next, x: px - ux * (next + GAP), y: py - uy * (next + GAP) };
    });
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAbout(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [zoomAbout]);

  // drag to pan
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let dragging = false;
    let moved = false;
    let last = { x: 0, y: 0 };
    const down = (e: PointerEvent) => {
      dragging = true;
      moved = false;
      last = { x: e.clientX, y: e.clientY };
      stage.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) {
        moved = true;
        stage.style.cursor = "grabbing";
      }
      last = { x: e.clientX, y: e.clientY };
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      try { stage.releasePointerCapture(e.pointerId); } catch {}
      stage.style.cursor = "grab";
      void moved;
    };
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    return () => {
      stage.removeEventListener("pointerdown", down);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerup", up);
      stage.removeEventListener("pointercancel", up);
    };
  }, []);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const active = selected.size > 0;

  return (
    <>
      <div ref={mapDivRef} className="tg-backdrop" />
      <div ref={stageRef} className="tg-stage">
        <div
          className="tg-grid"
          style={{
            transform: `translate(${view.x}px, ${view.y}px)`,
            gridTemplateColumns: `repeat(${cols}, ${view.tile}px)`,
            gap: `${GAP}px`,
          }}
        >
          {glifs.map((g) => {
            const inSel = !!g.categories[0] && selected.has(g.categories[0]);
            const hidden = active && !inSel;
            return (
              <div
                key={g.id}
                className="tg-cell"
                style={{ width: view.tile, height: view.tile, display: hidden ? "none" : "block" }}
                title={`#${g.id}${g.categories[0] ? " · " + g.categories[0] : ""}`}
                onMouseEnter={() => setHover(g.id)}
                onMouseLeave={() => setHover((h) => (h === g.id ? null : h))}
              >
                <img
                  src={hover === g.id ? g.gif : g.src}
                  alt={`glif #${g.id}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="tg-zoom">
        <button onClick={() => zoomAbout(1.4, window.innerWidth / 2, window.innerHeight / 2)} aria-label="zoom in">
          +
        </button>
        <button onClick={() => zoomAbout(1 / 1.4, window.innerWidth / 2, window.innerHeight / 2)} aria-label="zoom out">
          −
        </button>
      </div>

      <nav className="tg-cats" aria-label="glif collections">
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
        {active && (
          <button className="tg-chip tg-clear" onClick={() => setSelected(new Set())}>
            clear
          </button>
        )}
      </nav>
    </>
  );
}
