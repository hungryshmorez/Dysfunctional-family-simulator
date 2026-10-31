"use client";
import Link from 'next/link';
import { useEffect } from 'react';

// Landing / launcher. Both games are first-class here. Mark the stale-chunk
// watchdog satisfied (see app/layout.tsx) so this light page isn't reloaded
// after 20s like the heavier game routes that set __pcReady on module load.
export default function Page(): JSX.Element {
  useEffect(() => {
    try { (window as unknown as { __pcReady: boolean }).__pcReady = true; } catch { /* noop */ }
  }, []);
  return (
    <main className="launcher">
      <header className="launcher-head">
        <span className="launcher-mark">DF</span>
        <h1>Two ways to live</h1>
        <p>Pick a simulator. Your progress in each is saved separately in this browser.</p>
      </header>
      <div className="launcher-grid">
        <Link href="/family" className="launcher-card family">
          <span className="launcher-eyebrow">LIFE SIM · 7 CHAPTERS</span>
          <strong>Dysfunctional Family Simulator</strong>
          <span className="launcher-desc">Build a home, raise a family, and pass down your problems — childhood to old age.</span>
          <span className="launcher-go">Enter the house →</span>
        </Link>
        <Link href="/park" className="launcher-card park">
          <span className="launcher-eyebrow">WALKABLE · FIRST-PERSON</span>
          <strong>Trailer Park Simulator</strong>
          <span className="launcher-desc">Twelve single-wides on a dead-end road. You live in one, alone. Knock if you want in anywhere else.</span>
          <span className="launcher-go">Walk the lot →</span>
        </Link>
      </div>
      <footer className="launcher-foot">PASS DOWN YOUR PROBLEMS</footer>
    </main>
  );
}
