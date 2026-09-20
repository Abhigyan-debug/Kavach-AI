"use client";

import Link from "next/link";
import { useId } from "react";
import type { Lang } from "@/lib/schema";
import type { Dict } from "@/lib/i18n";

const SHIELD_PATH = "M32 10 51 17.5V33c0 10-8 17.4-19 20.8C21 50.4 13 43 13 33V17.5Z";

/**
 * The Kavach shield. Drawn as a single lime pass through a mask: the ring is
 * the shield minus a scaled copy of itself, the crescent is a disc minus an
 * offset disc. Filling *and* stroking each shield with a round linejoin rounds
 * every corner uniformly, which is what gives the soft shoulders.
 *
 * `useId` keeps the mask id unique if the mark is ever rendered twice on a page
 * - duplicate SVG ids silently break the second instance.
 */
export function ShieldMark({ className = "h-9 w-9" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <defs>
        <mask id={id}>
          <rect width="64" height="64" fill="#000" />
          <path
            d={SHIELD_PATH}
            fill="#fff"
            stroke="#fff"
            strokeWidth="6.5"
            strokeLinejoin="round"
          />
          <path
            d={SHIELD_PATH}
            transform="translate(32 31.5) scale(.66) translate(-32 -31.5)"
            fill="#000"
            stroke="#000"
            strokeWidth="6.5"
            strokeLinejoin="round"
          />
          <circle cx="31.6" cy="32" r="9.4" fill="#fff" />
          <circle cx="37.2" cy="26.6" r="9.2" fill="#000" />
        </mask>
      </defs>
      <rect width="64" height="64" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  );
}

/** Lime mark + wordmark, matching the pill-and-grid visual language. */
export function Logo({ label }: { label: string }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={label}>
      <ShieldMark className="h-9 w-9 text-lime" />
      <span className="font-display text-2xl font-extrabold lowercase tracking-tight">
        {label}
      </span>
    </Link>
  );
}

export function LangToggle({
  lang,
  onToggle,
  label,
}: {
  lang: Lang;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="min-h-[44px] rounded-pill border-2 border-edge px-4 text-sm font-bold text-white transition hover:border-lime hover:text-lime focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-lime"
      aria-label={`Switch language to ${lang === "en" ? "Hindi" : "English"}`}
    >
      {label}
    </button>
  );
}

export function Header({
  t,
  lang,
  onToggle,
}: {
  t: Dict;
  lang: Lang;
  onToggle: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-edge/60 bg-base/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo label={t.brand} />
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/check">{t.nav.check}</NavLink>
          <NavLink href="/drill">{t.nav.drill}</NavLink>
          <NavLink href="/helper">{t.nav.helper}</NavLink>
          <NavLink href="/family">{t.nav.family}</NavLink>
        </nav>
        <LangToggle lang={lang} onToggle={onToggle} label={t.common.language} />
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-pill px-4 py-2.5 text-base font-semibold text-muted transition hover:bg-raised hover:text-lime"
    >
      {children}
    </Link>
  );
}

/** Bottom tab bar - the primary navigation on a phone. */
export function MobileNav({ t }: { t: Dict }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-base/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex max-w-lg">
        <TabLink href="/check" label={t.nav.check} />
        <TabLink href="/drill" label={t.nav.drill} />
        <TabLink href="/helper" label={t.nav.helper} />
        <TabLink href="/family" label={t.nav.family} />
      </div>
    </nav>
  );
}

function TabLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[60px] flex-1 items-center justify-center px-2 text-center text-sm font-bold text-muted transition hover:text-lime"
    >
      {label}
    </Link>
  );
}

/** The indigo ground with its two grid layers, fading out toward the horizon. */
export function GridBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="grid-bg grid-fade absolute inset-0" />
      <div className="grid-bg-fine grid-fade absolute inset-0 opacity-60" />
      <div className="absolute left-1/2 top-0 h-[420px] w-[820px] max-w-[140vw] -translate-x-1/2 rounded-full bg-lime/10 blur-[120px]" />
    </div>
  );
}

export function PageShell({
  t,
  lang,
  onToggle,
  children,
}: {
  t: Dict;
  lang: Lang;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh bg-base">
      <GridBackdrop />
      <div className="relative">
        <Header t={t} lang={lang} onToggle={onToggle} />
        <main className="mx-auto max-w-3xl px-4 pb-32 pt-8 sm:px-6 md:pb-16">{children}</main>
        <MobileNav t={t} />
      </div>
    </div>
  );
}
