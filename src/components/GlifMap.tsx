"use client";

import { useEffect, useRef, useState, useCallback, useMemo, type CSSProperties } from "react";
import { CATEGORIES } from "@/data/categories";
import EditCategories from "@/components/EditCategories";

// Static NYC backdrop (a pre-rendered image — no live tile loading). Panned and
// scaled with CSS so it stays coupled to the glif grid. Natural pixel size:
const MAP_SRC = "/map/nyc.png";
const IMG_W = 3000;
const IMG_H = 1950;

const COLS = 20;
const ROWS = 15; // 20 x 15 = 300
const GAP = 3; // px between glifs — constant at every zoom
const MIN_TILE = 28; // max zoom OUT
const MAX_TILE = 200; // max zoom IN

type Glif = {
  id: number;
  src: string;
  gif: string;
  categories: string[];
  tags: string[];
};

type View = { tile: number; x: number; y: number };
type ImgView = { scale: number; x: number; y: number };

// Smallest image scale that still fully covers the viewport (with a little margin).
function coverScale(vw: number, vh: number): number {
  return Math.max(vw / IMG_W, vh / IMG_H) * 1.06;
}

// Keep the backdrop always covering the viewport: floor its scale at cover and
// clamp its offset so an edge can never show (no white border on zoom-out).
function clampImg(iv: ImgView): ImgView {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.max(coverScale(vw, vh), iv.scale);
  const w = IMG_W * scale;
  const h = IMG_H * scale;
  const x = Math.max(vw - w, Math.min(0, iv.x));
  const y = Math.max(vh - h, Math.min(0, iv.y));
  return { scale, x, y };
}

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
  const stageRef = useRef<HTMLDivElement>(null);
  const [glifs, setGlifs] = useState<Glif[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>({ tile: 40, x: 0, y: 0 });
  const [img, setImg] = useState<ImgView>({ scale: 1, x: 0, y: 0 });
  const [hover, setHover] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);

  // Latest view/img for event handlers. Updated ONLY via applyView/applyImg
  // (never during render — see react-hooks/refs).
  const viewRef = useRef<View>({ tile: 40, x: 0, y: 0 });
  const imgRef = useRef<ImgView>({ scale: 1, x: 0, y: 0 });
  const applyView = useCallback((v: View) => {
    viewRef.current = v;
    setView(v);
  }, []);
  const applyImg = useCallback((iv: ImgView) => {
    imgRef.current = iv;
    setImg(iv);
  }, []);

  // pill counts derived from current glifs (updates live during edits)
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const g of glifs) {
      const p = g.categories[0];
      if (p) c[p] = (c[p] || 0) + 1;
    }
    return c;
  }, [glifs]);

  // Gestures accumulate into `pending` and are applied to BOTH the grid and the
  // coupled backdrop image ONCE per animation frame (keeps the 300-tile grid from
  // re-rendering on every wheel/drag event). The image is just CSS-transformed —
  // no tile loading, ever.
  const pendingRef = useRef({ zf: 1, zpx: 0, zpy: 0, pdx: 0, pdy: 0, raf: 0 });

  const flush = useCallback(() => {
    const p = pendingRef.current;
    p.raf = 0;
    let v = viewRef.current;
    let iv = imgRef.current;

    if (p.zf !== 1) {
      const next = Math.min(MAX_TILE, Math.max(MIN_TILE, v.tile * p.zf));
      if (next !== v.tile) {
        const eff = next / v.tile;
        const ux = (p.zpx - v.x) / (v.tile + GAP);
        const uy = (p.zpy - v.y) / (v.tile + GAP);
        v = { tile: next, x: p.zpx - ux * (next + GAP), y: p.zpy - uy * (next + GAP) };
        // scale the backdrop by the same factor about the same point
        iv = {
          scale: iv.scale * eff,
          x: p.zpx - (p.zpx - iv.x) * eff,
          y: p.zpy - (p.zpy - iv.y) * eff,
        };
      }
      p.zf = 1;
    }

    if (p.pdx || p.pdy) {
      v = { ...v, x: v.x + p.pdx, y: v.y + p.pdy };
      iv = { ...iv, x: iv.x + p.pdx, y: iv.y + p.pdy };
      p.pdx = 0;
      p.pdy = 0;
    }

    applyView(v);
    applyImg(clampImg(iv));
  }, [applyView, applyImg]);

  const schedule = useCallback(() => {
    const p = pendingRef.current;
    if (!p.raf) p.raf = requestAnimationFrame(flush);
  }, [flush]);

  useEffect(() => () => {
    if (pendingRef.current.raf) cancelAnimationFrame(pendingRef.current.raf);
  }, []);

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

  // Backdrop image sized to cover the viewport, centered.
  const fitImg = useCallback((): ImgView => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = coverScale(vw, vh);
    return clampImg({ scale, x: (vw - IMG_W * scale) / 2, y: (vh - IMG_H * scale) / 2 });
  }, []);

  // --- load glifs (applying locally-saved edits), then fit the initial view.
  // Fitting happens HERE, once — not on later glifs changes — so editor
  // reassignments never reset the user's pan/zoom.
  useEffect(() => {
    let cancelled = false;
    fetch("/glifs.json")
      .then((r) => r.json())
      .then((data: Glif[]) => {
        if (cancelled) return;
        const overrides = loadOverrides();
        for (const g of data) {
          if (Object.prototype.hasOwnProperty.call(overrides, g.id)) {
            const v = overrides[g.id];
            g.categories = v ? [v] : []; // "" = bucket
          }
        }
        setGlifs(sortGlifs(data));
        applyView(fitTable());
        applyImg(fitImg());
      });
    return () => {
      cancelled = true;
    };
  }, [applyView, applyImg, fitTable, fitImg]);

  // Re-fit on window resize (listener only — no state set during the effect body).
  useEffect(() => {
    const onResize = () => {
      applyView(fitTable());
      applyImg(fitImg());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [applyView, applyImg, fitTable, fitImg]);

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
      if (n.has(id)) n.delete(id);
      else n.add(id);
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="tg-backdrop"
        src={MAP_SRC}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          width: IMG_W,
          height: IMG_H,
          transform: `translate(${img.x}px, ${img.y}px) scale(${img.scale})`,
        }}
      />
      <div className="tg-sidebar" aria-hidden="true" />
      <div ref={stageRef} className="tg-stage">
        <div
          className="tg-grid"
          style={{
            transform: `translate(${view.x}px, ${view.y}px)`,
            gridTemplateColumns: `repeat(${COLS}, ${view.tile}px)`,
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
                {/* eslint-disable-next-line @next/next/no-img-element -- 300 small local assets; next/image overhead unwanted */}
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
