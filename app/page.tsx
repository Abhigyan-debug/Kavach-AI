"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { Header, GridBackdrop, MobileNav } from "./components/Chrome";

export default function Home() {
  const { lang, toggle, t } = useLang();

  return (
    <div className="relative min-h-dvh bg-base">
      <GridBackdrop />

      <div className="relative">
        <Header t={t} lang={lang} onToggle={toggle} />

        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pb-20 pt-14 text-center sm:px-6 sm:pt-20">
          <h1 className="font-display text-[clamp(2.75rem,10vw,5.5rem)] font-extrabold leading-[0.95] tracking-tight text-lime">
            {t.home.h1a}
            <br />
            {t.home.h1b}{" "}
            <span className="text-white">{t.home.h1c}</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
            {t.home.sub}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/check" className="btn-lime w-full sm:w-auto">
              {t.home.cta}
            </Link>
            <Link href="/drill" className="btn-outline w-full sm:w-auto">
              {t.home.ctaAlt}
            </Link>
          </div>

          <p className="mt-8 text-base text-muted">
            {t.home.guardian}{" "}
            <Link href="/family" className="font-bold text-lime underline underline-offset-4">
              {t.home.guardianLink}
            </Link>
          </p>
        </section>

        {/* Three pillars */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-5 md:grid-cols-3">
            <Pillar
              n="01"
              title={t.home.pillars.check.title}
              body={t.home.pillars.check.body}
              href="/check"
            />
            <Pillar
              n="02"
              title={t.home.pillars.drill.title}
              body={t.home.pillars.drill.body}
              href="/drill"
            />
            <Pillar
              n="03"
              title={t.home.pillars.family.title}
              body={t.home.pillars.family.body}
              href="/family"
            />
          </div>
        </section>

        {/* Lime band, echoing the reference layout's solid colour break */}
        <section className="relative overflow-hidden bg-lime px-4 py-16 text-ink sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-display text-sm font-extrabold uppercase tracking-[0.2em] opacity-70">
              {t.home.statLabel}
            </p>
            <p className="mt-5 font-display text-[clamp(1.6rem,4.5vw,2.75rem)] font-extrabold leading-tight">
              {t.home.statBody}
            </p>
          </div>
        </section>

        <footer className="border-t border-edge/60 px-4 py-10 text-center text-base text-muted sm:px-6">
          <p className="font-display text-lg font-bold text-white">{t.tagline}</p>
          <p className="mt-3">
            Kavach is advisory and can be wrong. For real fraud, call 1930 or report at{" "}
            <a
              href="https://cybercrime.gov.in"
              className="font-semibold text-lime underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              cybercrime.gov.in
            </a>
            .
          </p>
        </footer>

        <MobileNav t={t} />
      </div>
    </div>
  );
}

function Pillar({
  n,
  title,
  body,
  href,
}: {
  n: string;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="card group block transition hover:border-lime hover:bg-raised"
    >
      <span className="font-display text-sm font-extrabold tracking-[0.2em] text-lime">{n}</span>
      <h2 className="mt-3 font-display text-2xl font-extrabold text-white">{title}</h2>
      <p className="mt-2.5 text-base leading-relaxed text-muted">{body}</p>
      <span className="mt-4 inline-block font-display text-base font-extrabold text-lime opacity-0 transition group-hover:opacity-100">
        →
      </span>
    </Link>
  );
}
