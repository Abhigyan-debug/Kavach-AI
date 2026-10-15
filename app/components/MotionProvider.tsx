"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/**
 * Wraps the app once so every component can use Motion cheaply.
 *
 * - LazyMotion + `m` components ship ~4.6 KB instead of the 34 KB `motion`
 *   component; domAnimation adds only entrances, hover and tap.
 * - `strict` throws if anyone imports the heavy `motion` component inside
 *   this tree, so the bundle budget enforces itself instead of drifting.
 * - reducedMotion="user" makes every Motion animation obey the OS
 *   "reduce motion" setting: transforms are skipped, opacity still fades.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
