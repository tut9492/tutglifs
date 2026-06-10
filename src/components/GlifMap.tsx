"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { noLabels } from "protomaps-themes-base";
import "maplibre-gl/dist/maplibre-gl.css";

type Glif = {
  id: number;
  src: string;
  lng: number;
  lat: number;
  category: string | null;
  tags: string[];
};

// Minimal black-line-on-white look, no labels — matches the reference NYC map.
const THEME = "white";
const PMTILES_URL = "pmtiles:///map/nyc.pmtiles";

export default function GlifMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs:
          "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
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

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    const markers: maplibregl.Marker[] = [];

    map.on("load", async () => {
      const glifs: Glif[] = await fetch("/glifs.json").then((r) => r.json());
      for (const g of glifs) {
        const el = document.createElement("div");
        el.className = "glif-marker";
        const img = document.createElement("img");
        img.src = g.src;
        img.alt = `glif #${g.id}`;
        img.loading = "lazy";
        el.appendChild(img);
        el.title = `#${g.id}`;
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([g.lng, g.lat])
          .addTo(map);
        markers.push(marker);
      }
    });

    return () => {
      markers.forEach((m) => m.remove());
      map.remove();
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  return <div ref={containerRef} className="glif-map" />;
}
