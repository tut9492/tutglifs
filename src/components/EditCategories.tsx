"use client";

import { useState, type CSSProperties, type DragEvent } from "react";
import { CATEGORIES } from "@/data/categories";

export type EditGlif = {
  id: number;
  src: string;
  categories: string[];
};

// Passing "" reassigns a glif to the bucket (no collection yet).
export const BUCKET = "";

type Props = {
  glifs: EditGlif[];
  onReassign: (id: number, category: string) => void;
  onExport: () => void;
  onReset: () => void;
  onClose: () => void;
};

export default function EditCategories({ glifs, onReassign, onExport, onReset, onClose }: Props) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const byCat: Record<string, EditGlif[]> = {};
  for (const c of CATEGORIES) byCat[c.id] = [];
  const bucket: EditGlif[] = [];
  for (const g of glifs) {
    const p = g.categories[0];
    if (p && byCat[p]) byCat[p].push(g);
    else bucket.push(g); // no (valid) collection → bucket
  }

  const handleDrop = (target: string) => (e: DragEvent) => {
    e.preventDefault();
    setDropTarget(null);
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isFinite(id)) onReassign(id, target);
  };

  const tile = (g: EditGlif) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={g.id}
      className="ec-tile"
      src={g.src}
      alt={`glif #${g.id}`}
      title={`#${g.id}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(g.id))}
    />
  );

  return (
    <div className="ec-overlay">
      <div className="ec-bar">
        <span className="ec-title">edit collections</span>
        <span className="ec-hint">drag a glif into a collection — or into the bucket if it has no home yet</span>
        <div className="ec-actions">
          <button className="ec-btn ec-reset" onClick={onReset}>reset</button>
          <button className="ec-btn ec-export" onClick={onExport}>export glifs.json</button>
          <button className="ec-btn ec-done" onClick={onClose}>done</button>
        </div>
      </div>

      <div className="ec-main">
        <div className="ec-body">
          {CATEGORIES.map((c) => {
            const items = byCat[c.id];
            return (
              <section
                key={c.id}
                className={`ec-section${dropTarget === c.id ? " is-drop" : ""}`}
                style={{ ["--c"]: c.color } as CSSProperties}
                onDragOver={(e) => { e.preventDefault(); if (dropTarget !== c.id) setDropTarget(c.id); }}
                onDragLeave={(e) => { if (e.currentTarget === e.target) setDropTarget(null); }}
                onDrop={handleDrop(c.id)}
              >
                <header className="ec-head">
                  <span className="ec-name">{c.label}</span>
                  <span className="ec-count">{items.length}</span>
                </header>
                <div className="ec-row">
                  {items.map(tile)}
                  {items.length === 0 && <span className="ec-empty">drop glifs here</span>}
                </div>
              </section>
            );
          })}
        </div>

        <aside
          className={`ec-bucket${dropTarget === "bucket" ? " is-drop" : ""}`}
          onDragOver={(e) => { e.preventDefault(); if (dropTarget !== "bucket") setDropTarget("bucket"); }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDropTarget(null); }}
          onDrop={handleDrop(BUCKET)}
        >
          <header className="ec-bucket-head">
            <span className="ec-bucket-title">bucket</span>
            <span className="ec-bucket-sub">no home yet</span>
            <span className="ec-bucket-count">{bucket.length}</span>
          </header>
          <div className="ec-bucket-body">
            {bucket.map(tile)}
            {bucket.length === 0 && (
              <span className="ec-empty">drag glifs you can&apos;t place here</span>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
