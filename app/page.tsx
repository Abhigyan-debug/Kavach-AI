"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { Header, GridBackdrop, MobileNav, ShieldMark } from "./components/Chrome";
import { useStreak } from "@/lib/streak";
import { useEffect, useState } from "react";
import { useReveal, useCountUp, useTypewriter } from "@/lib/motion";
import type { CheckResult, Verdict } from "@/lib/schema";
import { TACTICS } from "@/lib/schema";
import report from "@/public/benchmark.json";

type Dict = ReturnType<typeof useLang>["t"];
type DemoResult = CheckResult & { source: "ai" | "rules" };

const VERDICT_RING: Record<Verdict, string> = {
  SAFE: "border-lime",
  SUSPICIOUS: "border-amber",
  SCAM: "border-danger",
};
const VERDICT_TEXT: Record<Verdict, string> = {
  SAFE: "text-lime",
  SUSPICIOUS: "text-amber",
  SCAM: "text-danger",
};
const VERDICT_BAR: Record<Verdict, string> = {
  SAFE: "bg-lime",
  SUSPICIOUS: "bg-amber",
  SCAM: "bg-danger",
};

export default function Home() {
  const { lang, toggle, t } = useLang();
  const { ready, streak, boosterDue } = useStreak();

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-base">
      <GridBackdrop />

      <div className="relative">
        <Header t={t} lang={lang} onToggle={toggle} />

        {/* ---------------------------------------------------------- */}
        {/* Hero                                                        */}
        {/* ---------------------------------------------------------- */}
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-10 text-center sm:px-6 sm:pt-14">
          <ShieldMark className="animate-float mx-auto mb-6 h-20 w-20 text-lime drop-shadow-[0_18px_35px_rgba(191,255,60,0.35)] sm:h-24 sm:w-24" />

          <h1 className="animate-rise-3d font-display text-[clamp(2.75rem,10vw,5.5rem)] font-extrabold leading-[0.95] tracking-tight text-lime">
            <span className="sheen">
              {t.home.h1a}
              <br />
              {t.home.h1b} <span className="text-white">{t.home.h1c}</span>
            </span>
          </h1>

          <p
            className="animate-rise mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl"
            style={{ animationDelay: "0.12s" }}
          >
            {t.home.sub}
          </p>

          {/* Streak renders only after localStorage is read, so the server and
              client first render cannot disagree. */}
          {ready && streak > 0 && (
            <p className="animate-rise mt-6 inline-flex items-center gap-2 rounded-pill border-2 border-lime/50 bg-lime/10 px-5 py-2.5 text-base font-bold text-lime">
              <span aria-hidden>🔥</span>
              {streak} {streak === 1 ? t.home.streakDay : t.home.streakDays}
            </p>
          )}
          {ready && boosterDue && (
            <p className="animate-rise mt-4 text-base text-amber">{t.home.boosterDue}</p>
          )}

          <div
            className="animate-rise mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            style={{ animationDelay: "0.2s" }}
          >
            <Link href="/check" className="btn-lime w-full sm:w-auto">
              {t.home.cta}
            </Link>
            <Link href="/drill" className="btn-outline w-full sm:w-auto">
              {t.home.ctaAlt}
            </Link>
          </div>

          {/* The three objections a cautious user actually has. */}
          <ul
            className="animate-rise mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-sm text-muted"
            style={{ animationDelay: "0.3s" }}
          >
            {[t.home.trustPrivacy, t.home.trustOffline, t.home.trustFree].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Tick />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <LiveDemo t={t} />
        <Proof t={t} />
        <HowItWorks t={t} />

        {/* ---------------------------------------------------------- */}
        {/* Features                                                    */}
        {/* ---------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="stagger grid gap-5 sm:grid-cols-2">
            <Pillar n="01" title={t.home.pillars.check.title} body={t.home.pillars.check.body} href="/check" />
            <Pillar n="02" title={t.home.pillars.drill.title} body={t.home.pillars.drill.body} href="/drill" />
            <Pillar n="03" title={t.home.pillars.family.title} body={t.home.pillars.family.body} href="/family" />
            <Pillar n="04" title={t.helper.title} body={t.helper.sub} href="/helper" />
          </div>
        </section>

        <Tactics t={t} />

        {/* ---------------------------------------------------------- */}
        {/* Research band                                               */}
        {/* ---------------------------------------------------------- */}
        <section className="relative overflow-hidden bg-lime px-4 py-16 text-ink sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-display text-sm font-extrabold uppercase tracking-[0.2em] opacity-70">
              {t.home.researchLabel}
            </p>
            <p className="mt-5 font-display text-[clamp(1.6rem,4.5vw,2.75rem)] font-extrabold leading-tight">
              {t.home.researchBody}
            </p>
            <p className="mt-6 text-base font-semibold opacity-75">
              Roozenbeek &amp; van der Linden (2020) · Maertens et al. (2020) · Stajano &amp; Wilson
              (2011) · ScamPilot, CHI 2026
            </p>
          </div>
        </section>

        <FinalCta t={t} />

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

/* ------------------------------------------------------------------ */
/* Live demo                                                           */
/* ------------------------------------------------------------------ */

const DEMO_MESSAGE =
  "Dear Customer, your bank KYC has EXPIRED. Account will be blocked within 2 hours. Update at http://bit.ly/kyc-verify and share the OTP with our officer.";

/**
 * A self-running demo that calls the real /api/check endpoint. It types the
 * message out, then shows whatever the pipeline actually returns - verdict,
 * score, tactics and reasons all come from the response, never from a literal
 * in this file. Showing a hardcoded verdict here would be dressing a mockup up
 * as a result, which is exactly the kind of thing this product exists to catch.
 */
function LiveDemo({ t }: { t: Dict }) {
  const { ref, shown } = useReveal<HTMLDivElement>(0.3);
  const { out, done } = useTypewriter(DEMO_MESSAGE, shown, 90);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [failed, setFailed] = useState(false);

  // Fire as soon as the section is in view, so the answer is usually ready by
  // the time the typing finishes.
  useEffect(() => {
    if (!shown) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: DEMO_MESSAGE, lang: "en" }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as DemoResult;
        if (!cancelled) setResult(data);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shown]);

  const ready = done && result !== null;

  return (
    <section ref={ref} className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
      <p className="text-center font-display text-sm font-extrabold uppercase tracking-[0.2em] text-lime">
        {t.home.demoLabel}
      </p>
      <p className="mt-2 text-center text-base text-muted">{t.home.demoCaption}</p>

      <div className="mt-7 grid items-start gap-5 md:grid-cols-2">
        <div className="card">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-danger" aria-hidden />
            <span className="text-sm font-bold uppercase tracking-wide text-muted">SMS</span>
          </div>
          <p className="mt-4 min-h-[9rem] text-lg leading-relaxed text-white">
            {out}
            {!done && <span className="caret" aria-hidden />}
          </p>
        </div>

        <div
          className={`rounded-3xl border-4 bg-raised/80 p-6 backdrop-blur transition-opacity duration-700 ${
            ready ? "animate-rise-3d opacity-100" : "opacity-0"
          } ${result ? VERDICT_RING[result.verdict] : "border-edge"}`}
          aria-hidden={!ready}
        >
          {result && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  className={`font-display text-[clamp(1.75rem,6vw,2.5rem)] font-extrabold leading-none ${VERDICT_TEXT[result.verdict]}`}
                >
                  {t.verdicts[result.verdict]}
                </p>
                <span className="chip">{t.home.demoLive}</span>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline justify-between text-sm font-semibold text-muted">
                  <span>{t.check.riskLabel}</span>
                  <span className={`font-display text-xl font-extrabold ${VERDICT_TEXT[result.verdict]}`}>
                    {result.risk_score}/100
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-pill bg-ink">
                  <div
                    className={`h-full rounded-pill transition-all duration-1000 ease-out ${VERDICT_BAR[result.verdict]}`}
                    style={{ width: ready ? `${result.risk_score}%` : "0%" }}
                  />
                </div>
              </div>

              {result.tactics.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {result.tactics.map((x) => (
                    <span key={x} className="chip">
                      {x}
                    </span>
                  ))}
                </div>
              )}

              <ul className="mt-4 space-y-2 text-base leading-relaxed text-white">
                {result.reasons.map((r) => (
                  <li key={r} className="flex gap-2.5">
                    <span className={VERDICT_TEXT[result.verdict]} aria-hidden>
                      •
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Never leave a dead panel: if the call fails, say so and point at the
          real screen rather than showing an invented verdict. */}
      {failed && (
        <p className="mt-4 text-center text-base text-muted">
          {t.home.demoFailed}{" "}
          <Link href="/check" className="font-bold text-lime underline underline-offset-4">
            {t.home.cta}
          </Link>
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Measured proof                                                      */
/* ------------------------------------------------------------------ */

function Proof({ t }: { t: Dict }) {
  const { ref, shown } = useReveal<HTMLDivElement>(0.25);
  const recall = useCountUp(report.scamRecall, shown);
  const langs = useCountUp(2, shown, 900);

  return (
    <section ref={ref} className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <p className="text-center font-display text-sm font-extrabold uppercase tracking-[0.2em] text-lime">
        {t.home.proofLabel}
      </p>

      <div className="mt-7 grid gap-5 sm:grid-cols-3">
        <ProofTile value={`${recall}%`} label={t.home.proofScams} note={t.home.proofScamsNote} />
        <ProofTile
          value={String(report.falseAlarms.length)}
          label={t.home.proofFalse}
          note={t.home.proofFalseNote}
        />
        <ProofTile value={String(langs)} label={t.home.proofLangs} note={t.home.proofLangsNote} />
      </div>

      <p className="mt-6 text-center">
        <Link
          href="/benchmark"
          className="text-base font-bold text-lime underline underline-offset-4 hover:brightness-110"
        >
          {t.home.proofLink} →
        </Link>
      </p>
    </section>
  );
}

function ProofTile({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div className="card tilt text-center">
      <p className="font-display text-[clamp(3rem,10vw,4.5rem)] font-extrabold leading-none tabular-nums text-lime">
        {value}
      </p>
      <p className="mt-2 text-lg font-bold text-white">{label}</p>
      <p className="mt-1 text-sm text-muted">{note}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function HowItWorks({ t }: { t: Dict }) {
  const { ref, shown } = useReveal<HTMLDivElement>(0.2);
  const steps = [
    { n: "1", title: t.home.how1, body: t.home.how1b },
    { n: "2", title: t.home.how2, body: t.home.how2b },
    { n: "3", title: t.home.how3, body: t.home.how3b },
  ];

  return (
    <section ref={ref} className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <p className="text-center font-display text-sm font-extrabold uppercase tracking-[0.2em] text-lime">
        {t.home.howLabel}
      </p>

      <ol className={`mt-7 grid gap-5 md:grid-cols-3 ${shown ? "stagger" : "opacity-0"}`}>
        {steps.map((s) => (
          <li key={s.n} className="card relative">
            {/* Oversized ghost numeral adds depth behind the text. */}
            <span
              className="pointer-events-none absolute right-5 top-2 font-display text-7xl font-extrabold text-lime/10"
              aria-hidden
            >
              {s.n}
            </span>
            <h3 className="relative font-display text-xl font-extrabold text-white">{s.title}</h3>
            <p className="relative mt-2.5 text-base leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Tactics({ t }: { t: Dict }) {
  const { ref, shown } = useReveal<HTMLDivElement>(0.25);

  return (
    <section ref={ref} className="mx-auto max-w-4xl px-4 pb-20 text-center sm:px-6">
      <h2 className="font-display text-[clamp(1.6rem,5vw,2.5rem)] font-extrabold leading-tight text-white">
        {t.home.tacticsLabel}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted">
        {t.home.tacticsBody}
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        {TACTICS.map((tactic, i) => (
          <span
            key={tactic}
            className="rounded-pill border-2 border-edge bg-raised/60 px-5 py-2.5 text-base font-bold text-white transition hover:border-lime hover:text-lime"
            style={
              shown
                ? {
                    animation: "rise 0.5s cubic-bezier(.22,1,.36,1) both",
                    animationDelay: `${i * 0.05}s`,
                  }
                : { opacity: 0 }
            }
          >
            {tactic}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function FinalCta({ t }: { t: Dict }) {
  const { ref, shown } = useReveal<HTMLDivElement>(0.3);

  return (
    <section ref={ref} className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
      <div className={`card ${shown ? "animate-rise-3d" : "opacity-0"}`}>
        <ShieldMark className="mx-auto h-14 w-14 text-lime" />
        <h2 className="mt-5 font-display text-[clamp(1.75rem,6vw,3rem)] font-extrabold leading-tight text-white">
          {t.home.ctaTitle}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{t.home.ctaBody}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/check" className="btn-lime w-full sm:w-auto">
            {t.home.cta}
          </Link>
          <Link href="/helper" className="btn-outline w-full sm:w-auto">
            {t.helper.title}
          </Link>
        </div>
      </div>
    </section>
  );
}

function Tick() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0 text-lime"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m4 10.5 4 4 8-9" />
    </svg>
  );
}

function Pillar({ n, title, body, href }: { n: string; title: string; body: string; href: string }) {
  return (
    <Link href={href} className="card tilt group block hover:border-lime hover:bg-raised">
      <span className="font-display text-sm font-extrabold tracking-[0.2em] text-lime">{n}</span>
      <h2 className="mt-3 font-display text-2xl font-extrabold text-white">{title}</h2>
      <p className="mt-2.5 text-base leading-relaxed text-muted">{body}</p>
      <span className="mt-4 inline-block font-display text-base font-extrabold text-lime opacity-0 transition group-hover:opacity-100">
        →
      </span>
    </Link>
  );
}
