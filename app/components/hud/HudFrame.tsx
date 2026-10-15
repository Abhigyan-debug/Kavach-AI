"use client";

// motion/react-m keeps the bundle small; see MotionProvider.
import * as m from "motion/react-m";

/** Each corner: its position, which two borders it draws, and where it slides in from. */
const CORNERS = [
  { pos: "-left-1.5 -top-1.5 border-l-2 border-t-2", x: -8, y: -8 },
  { pos: "-right-1.5 -top-1.5 border-r-2 border-t-2", x: 8, y: -8 },
  { pos: "-bottom-1.5 -left-1.5 border-b-2 border-l-2", x: -8, y: 8 },
  { pos: "-bottom-1.5 -right-1.5 border-b-2 border-r-2", x: 8, y: 8 },
] as const;

/**
 * Corner brackets that frame a card like an instrument readout.
 *
 * Only transform and opacity animate (compositor-only, no layout or paint per
 * frame), the brackets are decorative so no text ever moves, and they settle
 * once rather than looping.
 */
export function HudFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {CORNERS.map((c, i) => (
        <m.span
          key={i}
          aria-hidden
          className={`pointer-events-none absolute z-10 h-4 w-4 border-lime ${c.pos}`}
          initial={{ opacity: 0, x: c.x, y: c.y }}
          whileInView={{ opacity: 1, x: 0, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.04 }}
        />
      ))}
      {children}
    </div>
  );
}
