"use client";

import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { namedTheme, noLabelsWithCustomTheme } from "protomaps-themes-base";
import "maplibre-gl/dist/maplibre-gl.css";
import { CATEGORIES } from "@/data/categories";
import EditCategories from "@/components/EditCategories";

const PMTILES_URL = "pmtiles:///map/nyc.pmtiles";

// Minimal white basemap, but with darker (toward-black) road lines for contrast.
const MAP_THEME = {
  ...namedTheme("white"),
  other: "#cfcfcf",
  minor_service: "#cfcfcf",
  minor_a: "#9a9a9a",
  minor_b: "#b4b4b4",
  link: "#7f7f7f",
  major: "#6a6a6a",
  highway: "#3f3f3f",
  railway: "#9a9a9a",
  boundaries: "#6a6a6a",
  buildings: "#e4e4e4",
};

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

const OVERRIDES_KEY = "tutglifs:overrides:v1";

// The in-app collection editor is a maintainer/dev tool. v1 ships read-only:
// it's enabled in local dev, and forks can turn it on with NEXT_PUBLIC_ENABLE_EDIT=true.
const EDIT_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_EDIT === "true";
const CAT_ORDER = new Map(CATEGORIES.map((c, i) => [c.id, i] as const));

// Sort by collection (CATEGORIES order) then id, so each collection is a band.
function sortGlifs(arr: Glif[]): Glif[] {
  const rank = (g: Glif) => {
    const p = g.categories[0];
    return p && CAT_ORDER.has(p) ? (CAT_ORDER.get(p) as number) : 999;
  };
  return [...arr].sort((a, b) => rank(a) - rank(b) || a.id - b.id);
}

function loadOverrides(): Record<number, string> {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function GlifMap() {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [glifs, setGlifs] = useState<Glif[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cols, setCols] = useState(COLS);
  const [view, setView] = useState<View>({ tile: 40, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [hover, setHover] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);

  // Gestures accumulate into `pending` and are applied to BOTH the grid and the
  // coupled map ONCE per animation frame. This stops the live vector map (and the
  // 300-tile grid) from re-rendering on every wheel/drag event — the cause of the
  // zoom-out lag.
  const pendingRef = useRef({ zf: 1, zpx: 0, zpy: 0, pdx: 0, pdy: 0, raf: 0 });

  const flush = useCallback(() => {
    const p = pendingRef.current;
    p.raf = 0;
    let v = viewRef.current;
    const map = mapRef.current;

    if (p.zf !== 1) {
      const next = Math.min(MAX_TILE, Math.max(MIN_TILE, v.tile * p.zf));
      if (next !== v.tile) {
        const eff = next / v.tile;
        const ux = (p.zpx - v.x) / (v.tile + GAP);
        const uy = (p.zpy - v.y) / (v.tile + GAP);
        v = { tile: next, x: p.zpx - ux * (next + GAP), y: p.zpy - uy * (next + GAP) };
        if (map) map.easeTo({ zoom: map.getZoom() + Math.log2(eff), around: map.unproject([p.zpx, p.zpy]), duration: 0 });
      }
      p.zf = 1;
    }

    if (p.pdx || p.pdy) {
      v = { ...v, x: v.x + p.pdx, y: v.y + p.pdy };
      if (map) map.panBy([-p.pdx, -p.pdy], { duration: 0 });
      p.pdx = 0;
      p.pdy = 0;
    }

    viewRef.current = v;
    setView(v);
  }, []);

  const schedule = useCallback(() => {
    const p = pendingRef.current;
    if (!p.raf) p.raf = requestAnimationFrame(flush);
  }, [flush]);

  useEffect(() => () => {
    if (pendingRef.current.raf) cancelAnimationFrame(pendingRef.current.raf);
  }, []);

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
        layers: noLabelsWithCustomTheme("protomaps", MAP_THEME),
      },
      center: [-73.971, 40.753],
      zoom: 11.2,
      attributionControl: { compact: true },
      fadeDuration: 0, // skip tile cross-fade re-renders
      renderWorldCopies: false,
    });
    mapRef.current = map;
    return () => {
      mapRef.current = null;
      map.remove();
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  // --- load glifs, applying any locally-saved edits, sorted into collection bands ---
  useEffect(() => {
    fetch("/glifs.json")
      .then((r) => r.json())
      .then((data: Glif[]) => {
        const overrides = loadOverrides();
        for (const g of data) {
          if (Object.prototype.hasOwnProperty.call(overrides, g.id)) {
            const v = overrides[g.id];
            g.categories = v ? [v] : []; // "" = bucket
          }
        }
        setGlifs(sortGlifs(data));
      });
  }, []);

  // counts derived from current glifs (so edits update the pills live)
  useEffect(() => {
    const c: Record<string, number> = {};
    for (const g of glifs) {
      const p = g.categories[0];
      if (p) c[p] = (c[p] || 0) + 1;
    }
    setCounts(c);
  }, [glifs]);

  // Default view: whole table visible (contained), centered in the space to the
  // right of the left sidebar, with the map showing around it.
  const fitTable = useCallback((): View => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const SIDEBAR = vw > 640 ? 300 : 0; // clear the left nav
    const padR = 40;
    const padY = 44;
    const tileW = (vw - SIDEBAR - padR - (COLS - 1) * GAP) / COLS;
    const tileH = (vh - padY * 2 - (ROWS - 1) * GAP) / ROWS;
    const tile = Math.max(MIN_TILE, Math.min(tileW, tileH));
    const gridW = COLS * tile + (COLS - 1) * GAP;
    const gridH = ROWS * tile + (ROWS - 1) * GAP;
    return {
      tile,
      x: Math.round(SIDEBAR + (vw - SIDEBAR - gridW) / 2),
      y: Math.round((vh - gridH) / 2),
    };
  }, []);

  // Fit the table on load + resize. Toggling collections does NOT relayout —
  // every glif stays in place so you can verify the seeded categories.
  useEffect(() => {
    if (glifs.length === 0) return;
    setCols(COLS);
    setView(fitTable());
    const onResize = () => setView(fitTable());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [glifs, fitTable]);

  // queue a zoom about a screen point (applied on the next frame by flush())
  const zoomAbout = useCallback(
    (factor: number, px: number, py: number) => {
      const p = pendingRef.current;
      p.zf *= factor;
      p.zpx = px;
      p.zpy = py;
      schedule();
    },
    [schedule]
  );

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
      const p = pendingRef.current;
      p.pdx += dx;
      p.pdy += dy;
      schedule();
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
  }, [schedule]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // --- edit collections (drag & drop reassignment) ---
  const reassign = useCallback((id: number, category: string) => {
    // category === "" means the bucket (no collection yet)
    setGlifs((prev) => {
      const next = prev.map((g) =>
        g.id === id ? { ...g, categories: category ? [category] : [] } : g
      );
      try {
        const o = loadOverrides();
        o[id] = category;
        localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
      } catch {}
      return sortGlifs(next);
    });
  }, []);

  const exportJson = useCallback(() => {
    const ordered = [...glifs].sort((a, b) => a.id - b.id);
    const blob = new Blob([JSON.stringify(ordered, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "glifs.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [glifs]);

  const resetEdits = useCallback(() => {
    try { localStorage.removeItem(OVERRIDES_KEY); } catch {}
    fetch("/glifs.json")
      .then((r) => r.json())
      .then((data: Glif[]) => setGlifs(sortGlifs(data)));
  }, []);

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
            const faded = active && !inSel;
            return (
              <div
                key={g.id}
                className="tg-cell"
                style={{ width: view.tile, height: view.tile, opacity: faded ? 0.12 : 1 }}
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
              style={{ ["--c"]: c.color } as CSSProperties}
              onClick={() => toggle(c.id)}
              title={c.label}
            >
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
        {EDIT_ENABLED && (
          <button className="tg-editbtn" onClick={() => setEditing(true)}>
            ✎ edit collections
          </button>
        )}
      </nav>

      {EDIT_ENABLED && editing && (
        <EditCategories
          glifs={glifs}
          onReassign={reassign}
          onExport={exportJson}
          onReset={resetEdits}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
