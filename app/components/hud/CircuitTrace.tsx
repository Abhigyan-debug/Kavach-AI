"use client";

import { useEffect, useRef } from "react";

/**
 * Circuit traces linking the three "How it works" steps. Node x-positions
 * (200 / 600 / 1000 of 1200) sit over the centres of a 3-column grid.
 * The 45-degree jogs are what make a line read as a circuit, not a divider.
 */
const TRACES = [
  "M20 40 H188",
  "M212 40 H330 L350 20 H450 L470 40 H588",
  "M612 40 H730 L750 60 H850 L870 40 H988",
  "M1012 40 H1180",
  "M350 20 V8",
  "M850 60 V72",
];
const NODES = [200, 600, 1000];

type Revertable = { revert: () => unknown };

/**
 * Draws itself once, when scrolled into view.
 *
 * - anime.js is loaded with a dynamic import() inside the observer callback,
 *   so it costs nothing on first page load and is never downloaded at all on
 *   screens where the trace is hidden (display:none never intersects).
 * - The SVG starts at opacity 0 and is revealed only after every line has been
 *   set to "nothing drawn", so there is no flash of finished lines first.
 * - Reduced motion, a missing IntersectionObserver or a failed import all fall
 *   back to simply showing the finished drawing: it is decoration, never content.
 * - Cleanup reverts the animations, so leaving the page leaks nothing.
 */
export function CircuitTrace({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => {
      el.style.opacity = "1";
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      show();
      return;
    }

    const running: Revertable[] = [];
    let cancelled = false;

    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect(); // draw once; replaying on every scroll is noise

        try {
          const { animate, svg, stagger, utils } = await import("animejs");
          if (cancelled) return; // unmounted while the library was downloading

          const lines = svg.createDrawable(el.querySelectorAll("path"));
          const nodes = el.querySelectorAll("circle");

          // Hide everything first, then reveal the container: no flash.
          utils.set(lines, { draw: "0 0" });
          utils.set(nodes, { opacity: 0 });
          show();

          running.push(
            animate(lines, {
              draw: "0 1",
              duration: 1100,
              delay: stagger(140),
              ease: "inOutQuad",
            }),
            animate(nodes, {
              opacity: 1,
              duration: 400,
              delay: stagger(280, { start: 250 }),
              ease: "outQuad",
            }),
          );
        } catch {
          show();
        }
      },
      { threshold: 0.4 },
    );

    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      running.forEach((a) => a.revert());
    };
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 1200 80"
      fill="none"
      aria-hidden
      className={className}
      style={{ opacity: 0 }}
    >
      <g stroke="#BFFF3C" strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {TRACES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {NODES.map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={40} r={10} fill="#0A1018" stroke="#BFFF3C" strokeWidth={2} />
          <circle cx={cx} cy={40} r={3.5} fill="#BFFF3C" />
        </g>
      ))}
    </svg>
  );
}
