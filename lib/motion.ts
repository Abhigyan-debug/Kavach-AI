"use client";

import { useEffect, useRef, useState } from "react";

/** True once the user has asked for reduced motion. */
function prefersReduced(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Reveals an element the first time it scrolls into view.
 *
 * Returns a ref and a boolean rather than mutating classes directly, so each
 * caller decides what "revealed" looks like. Falls back to permanently visible
 * when IntersectionObserver is missing or motion is reduced - content must
 * never depend on an animation having run.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReduced() || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect(); // reveal once; re-animating on scroll-back is noise
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, shown };
}

/**
 * Counts from 0 to `to` once `active` becomes true, on an ease-out curve so it
 * decelerates into the final value instead of stopping dead.
 */
export function useCountUp(to: number, active: boolean, durationMs = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (prefersReduced()) {
      setValue(to);
      return;
    }

    let frame = 0;
    const started = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(to * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, active, durationMs]);

  return value;
}

/**
 * Types `text` out one character at a time once `active` is true.
 * Used for the hero's self-running demo, which never calls the API - it has to
 * be instant and identical every time it is shown to a judge.
 */
export function useTypewriter(text: string, active: boolean, cps = 45) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    if (prefersReduced()) {
      setOut(text);
      setDone(true);
      return;
    }

    setOut("");
    setDone(false);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, 1000 / cps);

    return () => window.clearInterval(id);
  }, [text, active, cps]);

  return { out, done };
}
