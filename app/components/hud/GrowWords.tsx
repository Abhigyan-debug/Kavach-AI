"use client";

import * as m from "motion/react-m";
import type { Variants } from "motion/react";

type Segment = { text: string; className?: string; breakAfter?: boolean };

const LIST: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09 } },
};

// Each word grows up from its baseline with a little spring overshoot.
const WORD: Variants = {
  hidden: { opacity: 0, scale: 0.45, y: 24 },
  shown: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 420, damping: 22 },
  },
};

/**
 * A heading whose words grow in one after another.
 * Words are split on spaces, never letters, so Hindi stays intact. Each word
 * is an inline-block so it can scale; only transform and opacity animate.
 * `start` lets the hero wait until the boot intro has finished.
 */
export function GrowWords({
  as = "h1",
  segments,
  start,
  className = "",
}: {
  as?: "h1" | "h2";
  segments: Segment[];
  start: boolean;
  className?: string;
}) {
  const Tag = as === "h1" ? m.h1 : m.h2;
  return (
    <Tag className={className} variants={LIST} initial="hidden" animate={start ? "shown" : "hidden"}>
      {segments.map((seg, si) => (
        <span key={si}>
          {seg.text.split(" ").map((word, wi, all) => (
            <span key={wi}>
              <m.span className={`inline-block origin-bottom ${seg.className ?? ""}`} variants={WORD}>
                {word}
              </m.span>
              {wi < all.length - 1 ? " " : ""}
            </span>
          ))}
          {seg.breakAfter ? <br /> : " "}
        </span>
      ))}
    </Tag>
  );
}
