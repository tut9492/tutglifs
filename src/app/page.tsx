"use client";

import dynamic from "next/dynamic";

const GlifMap = dynamic(() => import("@/components/GlifMap"), { ssr: false });

export default function Home() {
  return (
    <main>
      <header className="tg-header">
        <span className="tg-wordmark">tutglifs</span>
        <span className="tg-sub">a map of the glif language</span>
      </header>
      <GlifMap />
    </main>
  );
}
