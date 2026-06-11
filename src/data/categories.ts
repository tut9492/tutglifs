// The collections of the glif language. The id is stable (used in glifs.json);
// the label is what the UI shows. This list (and the per-glif categories in
// public/glifs.json) is the open-source contribution surface: PR new
// collections, recolor, relabel, or re-home glifs.

export type Category = {
  id: string;
  label: string;
  color: string;
  /** Neighborhood centroid [lng, lat] (vestigial — clustering is parked). */
  centroid: [number, number];
  /** Human name of the neighborhood. */
  hood: string;
};

export const CATEGORIES: Category[] = [
  { id: "faces", label: "Faces", color: "#E4572E", centroid: [-74.0045, 40.7345], hood: "West Village" },
  { id: "figures", label: "Figures", color: "#2D5DA1", centroid: [-73.9840, 40.7549], hood: "Midtown" },
  { id: "hands", label: "Hands", color: "#F4A623", centroid: [-74.0010, 40.7240], hood: "SoHo" },
  { id: "animals", label: "Animals", color: "#2E8B57", centroid: [-73.9600, 40.7730], hood: "Upper East Side" },
  { id: "nature", label: "Nature", color: "#8FBC4B", centroid: [-73.9680, 40.7825], hood: "Central Park" },
  { id: "circles", label: "Circles", color: "#8E5DD6", centroid: [-74.0110, 40.7060], hood: "Financial District" },
  { id: "items", label: "Objects / Abstract", color: "#17A2A2", centroid: [-74.0000, 40.7460], hood: "Chelsea" },
  { id: "symbols", label: "Squares", color: "#5B6472", centroid: [-73.9560, 40.7155], hood: "Williamsburg" },
];

export const CATEGORY_BY_ID: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);
