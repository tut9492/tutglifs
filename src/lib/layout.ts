import { CATEGORY_BY_ID } from "@/data/categories";

export type Glif = {
  id: number;
  src: string;
  lng: number;
  lat: number;
  categories: string[];
  tags: string[];
};

export type Placed = Glif & {
  /** Atlas position (the default scattered grid over Manhattan). */
  grid: [number, number];
  /** Position inside the glif's primary-category neighborhood cluster. */
  cluster: [number, number];
  primary: string | null;
};

// Roughly square spacing in meters at NYC latitude (1° lng ≈ 0.76 × 1° lat).
const LAT_STEP = 0.00085;
const LNG_STEP = 0.00112;

/**
 * Compute each glif's cluster position: a compact centered grid around its
 * primary category's neighborhood centroid, indexed by order within category.
 */
export function placeGlifs(glifs: Glif[]): Placed[] {
  const seen: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const g of glifs) {
    const p = g.categories[0];
    if (p) counts[p] = (counts[p] || 0) + 1;
  }

  return glifs.map((g) => {
    const primary = g.categories[0] ?? null;
    const grid: [number, number] = [g.lng, g.lat];
    let cluster: [number, number] = grid;

    if (primary && CATEGORY_BY_ID[primary]) {
      const cat = CATEGORY_BY_ID[primary];
      const i = seen[primary] ?? 0;
      seen[primary] = i + 1;
      const n = counts[primary];
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      const col = i % cols;
      const row = Math.floor(i / cols);
      // center the grid on the centroid
      const lng = cat.centroid[0] + (col - (cols - 1) / 2) * LNG_STEP;
      const lat = cat.centroid[1] - (row - (rows - 1) / 2) * LAT_STEP;
      cluster = [lng, lat];
    }

    return { ...g, grid, cluster, primary };
  });
}
