"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import type { Variants } from "motion/react";
import { SHIELD_PATH, ShieldMark } from "../Chrome";

/** Fired on window when the intro ends, so the hero knows when to start. */
export const INTRO_DONE_EVENT = "kavach:intro-done";

/** How long the logo assembles before it flies into the header. */
const ASSEMBLE_MS = 1500;

type Phase = "idle" | "assemble" | "dock" | "done";
type Dock = { x: number; y: number; scale: number };

/**
 * Split a word into what a reader sees as single characters (graphemes).
 * Array.from would split Hindi letters from their vowel signs, breaking कवच-style
 * text into fragments; Intl.Segmenter keeps them together.
 */
function graphemes(word: string): string[] {
  try {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(seg.segment(word), (s) => s.segment);
  } catch {
    return Array.from(word);
  }
}

const LETTERS: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.7 } },
};

// A stiff, slightly under-damped spring: each letter overshoots and settles,
// like a servo locking into position.
const LETTER: Variants = {
  hidden: { opacity: 0, scale: 0.2, y: 20 },
  shown: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 520, damping: 20 } },
};

/**
 * Landing-page boot sequence:
 *   1. the shield outline draws itself, then the solid mark snaps in
 *   2. the brand letters grow in one by one
 *   3. the whole logo flies into the header and becomes the header logo
 *
 * It only runs when layout.tsx's pre-paint script set data-intro="on":
 * landing page, first visit this session, reduced motion not requested.
 * Tap, click, the Skip button or Escape end it at once. CSS hides it after
 * 5 seconds no matter what, so it can never trap anyone.
 *
 * The intro logo is laid out at exactly 2.5x the header logo (90px shield,
 * 60px text, 20px gap vs 36 / 24 / 8), so scaling it by the measured ratio
 * lands it precisely on top of the real one.
 */
export function BootIntro({
  brand,
  online,
  skipLabel,
}: {
  brand: string;
  online: string;
  skipLabel: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [dock, setDock] = useState<Dock | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return; // skip + natural end can both fire
    finished.current = true;
    document.documentElement.removeAttribute("data-intro");
    window.dispatchEvent(new Event(INTRO_DONE_EVENT));
    setPhase("done");
  }, []);

  useEffect(() => {
    if (document.documentElement.getAttribute("data-intro") !== "on") {
      setPhase("done");
      return;
    }
    try {
      sessionStorage.setItem("kavach.intro", "1");
    } catch {
      /* private mode: the intro may replay, which is harmless */
    }
    setPhase("assemble");

    const timer = window.setTimeout(() => {
      const from = groupRef.current?.getBoundingClientRect();
      const to = document.querySelector("[data-logo-anchor]")?.getBoundingClientRect();
      if (!from || !to || from.width === 0) return finish();
      setDock({
        x: to.left + to.width / 2 - (from.left + from.width / 2),
        y: to.top + to.height / 2 - (from.top + from.height / 2),
        scale: to.width / from.width,
      });
      setPhase("dock");
    }, ASSEMBLE_MS);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [finish]);

  if (phase === "done") return null;
  const running = phase !== "idle";

  return (
    <div
      className="boot-overlay fixed inset-0 z-[100] items-center justify-center"
      onClick={finish}
      role="presentation"
    >
      {/* Background fades away while the logo flies, revealing the page. */}
      <m.div
        className="grid-bg absolute inset-0 bg-base"
        animate={{ opacity: phase === "dock" ? 0 : 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      />

      <m.div
        ref={groupRef}
        className="relative flex items-center gap-5"
        animate={dock ? { x: dock.x, y: dock.y, scale: dock.scale } : undefined}
        transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
        onAnimationComplete={() => {
          if (phase === "dock") finish();
        }}
      >
        <div className="relative h-[90px] w-[90px]">
          {/* 1. Outline draws itself, then fades as the solid mark appears. */}
          <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full" aria-hidden>
            <m.path
              d={SHIELD_PATH}
              fill="none"
              stroke="#BFFF3C"
              strokeWidth={2.5}
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={running ? { pathLength: [0, 1, 1], opacity: [1, 1, 0] } : undefined}
              transition={{ duration: 1.1, times: [0, 0.55, 1], ease: "easeInOut" }}
            />
          </svg>
          <m.div
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={running ? { opacity: 1, scale: 1 } : undefined}
            transition={{ delay: 0.55, type: "spring", stiffness: 380, damping: 18 }}
          >
            <ShieldMark className="h-full w-full text-lime drop-shadow-[0_0_28px_rgba(191,255,60,0.5)]" />
          </m.div>
        </div>

        {/* 2. Letters grow in one by one. */}
        <m.span
          className="font-display text-[60px] font-extrabold lowercase leading-[80px] tracking-tight text-white"
          variants={LETTERS}
          initial="hidden"
          animate={running ? "shown" : "hidden"}
          aria-label={brand}
        >
          {graphemes(brand).map((ch, i) => (
            <m.span key={`${ch}-${i}`} className="inline-block origin-bottom" variants={LETTER} aria-hidden>
              {ch}
            </m.span>
          ))}
        </m.span>
      </m.div>

      <m.p
        className="telemetry absolute left-1/2 top-[calc(50%+72px)] -translate-x-1/2 font-mono text-sm font-bold uppercase tracking-[0.3em] text-lime"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "assemble" ? 1 : 0 }}
        transition={{ delay: phase === "assemble" ? 1.15 : 0, duration: 0.25 }}
        aria-hidden
      >
        {online}
      </m.p>

      <button
        type="button"
        onClick={finish}
        className="telemetry absolute bottom-[max(2rem,env(safe-area-inset-bottom))] right-6 min-h-[48px] rounded-pill border-2 border-edge px-5 font-mono text-sm font-bold uppercase tracking-widest text-muted transition hover:border-lime hover:text-lime"
      >
        {skipLabel} ›
      </button>
    </div>
  );
}

/**
 * True once the intro is over, or immediately when there is no intro. The
 * 5-second fallback mirrors the CSS failsafe, so nothing ever waits forever.
 */
export function useIntroDone(): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (document.documentElement.getAttribute("data-intro") !== "on") {
      setDone(true);
      return;
    }
    const on = () => setDone(true);
    window.addEventListener(INTRO_DONE_EVENT, on);
    const fallback = window.setTimeout(on, 5000);
    return () => {
      window.removeEventListener(INTRO_DONE_EVENT, on);
      window.clearTimeout(fallback);
    };
  }, []);
  return done;
}
