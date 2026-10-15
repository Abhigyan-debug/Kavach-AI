/**
 * A section label styled as a machine readout: a status light, an optional
 * index code, then the label. Monospace is reserved for short labels like
 * this; body text stays in Inter for readability.
 */
export function Telemetry({
  code,
  children,
  align = "center",
  className = "",
}: {
  code?: string;
  children: React.ReactNode;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <p
      className={`telemetry flex items-center gap-2.5 font-mono text-sm font-bold uppercase tracking-[0.22em] text-lime ${
        align === "center" ? "justify-center" : "justify-start"
      } ${className}`}
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
      </span>
      {code && <span className="text-muted">{code}</span>}
      <span>{children}</span>
    </p>
  );
}
