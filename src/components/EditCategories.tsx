"use client";

import { useState, type CSSProperties, type DragEvent } from "react";
import { CATEGORIES } from "@/data/categories";

export type EditGlif = {
  id: number;
  src: string;
  categories: string[];
};

type Props = {
  glifs: EditGlif[];
  onReassign: (id: number, category: string) => void;
  onExport: () => void;
  onReset: () => void;
  onClose: () => void;
};

export default function EditCategories({ glifs, onReassign, onExport, onReset, onClose }: Props) {
  const [dropCat, setDropCat] = useState<string | null>(null);

  const byCat: Record<string, EditGlif[]> = {};
  for (const c of CATEGORIES) byCat[c.id] = [];
  for (const g of glifs) {
    const p = g.categories[0];
    if (p && byCat[p]) byCat[p].push(g);
  }

  const handleDrop = (catId: string) => (e: DragEvent) => {
    e.preventDefault();
    setDropCat(null);
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isFinite(id)) onReassign(id, catId);
  };

  return (
    <div className="ec-overlay">
      <div className="ec-bar">
        <span className="ec-title">edit collections</span>
        <span className="ec-hint">drag a glif into another collection</span>
        <div className="ec-actions">
          <button className="ec-btn ec-reset" onClick={onReset}>reset</button>
          <button className="ec-btn ec-export" onClick={onExport}>export glifs.json</button>
          <button className="ec-btn ec-done" onClick={onClose}>done</button>
        </div>
      </div>

      <div className="ec-body">
        {CATEGORIES.map((c) => {
          const items = byCat[c.id];
          return (
            <section
              key={c.id}
              className={`ec-section${dropCat === c.id ? " is-drop" : ""}`}
              style={{ ["--c"]: c.color } as CSSProperties}
              onDragOver={(e) => { e.preventDefault(); if (dropCat !== c.id) setDropCat(c.id); }}
              onDragLeave={(e) => { if (e.currentTarget === e.target) setDropCat(null); }}
              onDrop={handleDrop(c.id)}
            >
              <header className="ec-head">
                <span className="ec-name">{c.label}</span>
                <span className="ec-count">{items.length}</span>
              </header>
              <div className="ec-row">
                {items.map((g) => (
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
                ))}
                {items.length === 0 && <span className="ec-empty">drop glifs here</span>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
