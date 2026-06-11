"use client";

import dynamic from "next/dynamic";

const GlifMap = dynamic(() => import("@/components/GlifMap"), { ssr: false });

const GLIFS_SITE = "https://www.glifs.art/";

function Wordmark() {
  return (
    <div className="tg-logo">
      <a
        className="tg-glifs"
        href={GLIFS_SITE}
        target="_blank"
        rel="noopener noreferrer"
        title="GLiFS by Efdot — glifs.art"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/glifs-logo.gif" alt="GLiFS by Efdot" />
      </a>
      <span className="tg-logo-guide">guide</span>
      <a
        className="tg-efdot"
        href={GLIFS_SITE}
        target="_blank"
        rel="noopener noreferrer"
        title="GLiFS by Efdot — glifs.art"
      >
        by Efdot ↗
      </a>
    </div>
  );
}

function Credit() {
  return (
    <div className="tg-credit">
      <a
        className="tg-builtby"
        href="https://x.com/tuteth_"
        target="_blank"
        rel="noopener noreferrer"
        title="built by tut — @tuteth_ on X"
      >
        <span className="tg-builtby-label">built by</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="tg-builtby-logo" src="/tut-logo.png" alt="tut" />
      </a>
      <p className="tg-footnote">
        not an official GLiFS site · open source · no wallet connect, ever
      </p>
      <p className="tg-attrib">
        map ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap
        </a>{" "}
        contributors ·{" "}
        <a href="https://protomaps.com" target="_blank" rel="noopener noreferrer">
          Protomaps
        </a>
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <GlifMap />
      <Wordmark />
      <Credit />
    </main>
  );
}
