import { ShieldMark } from "../Chrome";

/** 60 tick marks around a circle; every 5th is longer, like a dial. */
const TICKS = Array.from({ length: 60 }, (_, i) => {
  const a = (i / 60) * Math.PI * 2;
  const long = i % 5 === 0;
  const r1 = long ? 86 : 91;
  const r2 = 97;
  // Rounded so server and browser render identical attribute strings.
  const at = (r: number, f: (x: number) => number) => Math.round((100 + r * f(a)) * 100) / 100;
  return { x1: at(r1, Math.cos), y1: at(r1, Math.sin), x2: at(r2, Math.cos), y2: at(r2, Math.sin), long };
});

/**
 * The hero centrepiece: the shield inside a targeting reticle.
 * Three layers rotate at different speeds (CSS, transform-only, compositor):
 * an outer tick dial, an inner dashed ring turning the other way, and a radar
 * sweep. Reduced motion stops all three (see globals.css).
 */
export function Reticle({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden>
      {/* Radar sweep, clipped to a circle. */}
      <div className="absolute inset-[6%] overflow-hidden rounded-full">
        <div className="radar-sweep absolute inset-0 rounded-full" />
      </div>

      <svg viewBox="0 0 200 200" className="spin-slow absolute inset-0 h-full w-full">
        <circle cx="100" cy="100" r="97" fill="none" stroke="#BFFF3C" strokeOpacity="0.18" />
        {TICKS.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#BFFF3C"
            strokeOpacity={t.long ? 0.75 : 0.3}
            strokeWidth={t.long ? 1.6 : 1}
          />
        ))}
      </svg>

      <svg viewBox="0 0 200 200" className="spin-rev absolute inset-[16%] h-[68%] w-[68%]">
        <circle
          cx="100"
          cy="100"
          r="96"
          fill="none"
          stroke="#BFFF3C"
          strokeOpacity="0.4"
          strokeWidth="1.5"
          strokeDasharray="10 14"
        />
      </svg>

      {/* Crosshair hairlines. */}
      <div className="absolute left-1/2 top-[2%] h-[12%] w-px -translate-x-1/2 bg-lime/40" />
      <div className="absolute bottom-[2%] left-1/2 h-[12%] w-px -translate-x-1/2 bg-lime/40" />
      <div className="absolute left-[2%] top-1/2 h-px w-[12%] -translate-y-1/2 bg-lime/40" />
      <div className="absolute right-[2%] top-1/2 h-px w-[12%] -translate-y-1/2 bg-lime/40" />

      <ShieldMark className="absolute inset-[30%] h-[40%] w-[40%] text-lime drop-shadow-[0_0_24px_rgba(191,255,60,0.45)]" />
    </div>
  );
}
