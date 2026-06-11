"use client";

import dynamic from "next/dynamic";

const GlifMap = dynamic(() => import("@/components/GlifMap"), { ssr: false });

// crayon palette cycled across the wordmark letters
const CRAYONS = ["#ef4136", "#f7941e", "#ffcd00", "#39b54a", "#0072bc", "#92278f", "#ec008c"];

function Wordmark() {
  const name = "glif dictionary";
  let ci = 0;
  return (
    <a
      className="tg-logo"
      href="https://x.com/tuteth_"
      target="_blank"
      rel="noopener noreferrer"
      title="built by tut — @tuteth_ on X"
    >
      <span className="tg-logo-name">
        {name.split("").map((ch, i) =>
          ch === " " ? (
            <span key={i} className="tg-space">
              &nbsp;
            </span>
          ) : (
            <span key={i} style={{ color: CRAYONS[ci++ % CRAYONS.length] }}>
              {ch}
            </span>
          )
        )}
      </span>
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
