"use client";

import dynamic from "next/dynamic";

const GlifMap = dynamic(() => import("@/components/GlifMap"), { ssr: false });

// GLIFS brand wordmark — per-letter colors matched to the logo
const GLIFS = [
  { ch: "G", color: "#1c2b50" }, // navy
  { ch: "L", color: "#e8642a" }, // orange
  { ch: "I", color: "#f2b705" }, // gold
  { ch: "F", color: "#3a6ea5" }, // blue
  { ch: "S", color: "#f2b705" }, // gold
];

function Wordmark() {
  return (
    <a
      className="tg-logo"
      href="https://x.com/tuteth_"
      target="_blank"
      rel="noopener noreferrer"
      title="built by tut — @tuteth_ on X"
    >
      <span className="tg-logo-name">
        {GLIFS.map(({ ch, color }, i) => (
          <span key={i} style={{ color }}>
            {ch}
          </span>
        ))}
      </span>
      <span className="tg-logo-guide">guide</span>
      <span className="tg-logo-by">built by tut · @tuteth_</span>
    </a>
  );
}

export default function Home() {
  return (
    <main>
      <GlifMap />
      <Wordmark />
    </main>
  );
}
