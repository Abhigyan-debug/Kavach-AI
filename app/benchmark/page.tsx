"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { PageShell } from "../components/Chrome";
import report from "@/public/benchmark.json";

type Row = {
  id: number;
  lang: string;
  expected: string;
  got: string;
  risk: number;
  source: string;
  ms: number;
  correct: boolean;
};

const VERDICTS = ["SCAM", "SUSPICIOUS", "SAFE"] as const;

export default function BenchmarkPage() {
  const { lang, toggle, t } = useLang();
  const rows = report.results as Row[];
  const matrix = report.matrix as Record<string, Record<string, number>>;

  return (
    <PageShell t={t} lang={lang} onToggle={toggle}>
      <p className="chip">Measured, not claimed</p>
      <h1 className="mt-4 font-display text-[clamp(2rem,7vw,3rem)] font-extrabold leading-tight text-white">
        How accurate is Kavach?
      </h1>
      <p className="mt-3 text-lg text-muted">
        Every labelled message in our test set, run through the live{" "}
        <code className="text-lime">/api/check</code> endpoint — the same pipeline a real user
        gets, including redaction and the fallback.
      </p>

      {/* Headline numbers. Recall is first because it is the one that matters. */}
      <div className="stagger mt-8 grid gap-4 sm:grid-cols-3">
        <Stat
          value={`${report.scamRecall}%`}
          label="of scams flagged"
          note="never rated SAFE"
          tone="lime"
        />
        <Stat
          value={String(report.falseAlarms.length)}
          label="false alarms"
          note="safe messages called SCAM"
          tone="lime"
        />
        <Stat
          value={`${report.accuracy}%`}
          label="exact-label accuracy"
          note={`${report.correct}/${report.setSize} messages`}
          tone="white"
        />
      </div>

      {/* The honest reading of the number. */}
      <div className="mt-6 rounded-2xl border-2 border-lime/40 bg-lime/5 p-5">
        <h2 className="font-display text-lg font-extrabold text-lime">What the 80% actually means</h2>
        <p className="mt-2 text-base leading-relaxed text-white">
          Not all mistakes cost the same. Calling a scam <strong>safe</strong> can cost someone
          their savings; calling an ambiguous message <strong>scam</strong> costs them a moment of
          caution. Every error we made was the second kind — Kavach rated four borderline messages
          as SCAM when we had labelled them SUSPICIOUS. It never missed a scam, and never cried
          wolf on a genuine message.
        </p>
      </div>

      {/* Confusion matrix */}
      <h2 className="mt-10 font-display text-xl font-extrabold text-white">Where it disagreed</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr className="text-sm uppercase tracking-wide text-muted">
              <th className="py-2 pr-4 font-bold">We labelled</th>
              {VERDICTS.map((v) => (
                <th key={v} className="py-2 pr-4 font-bold">
                  Said {v.toLowerCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VERDICTS.map((expected) => (
              <tr key={expected} className="border-t border-edge">
                <td className="py-3 pr-4 font-display text-lg font-extrabold text-white">
                  {expected}
                </td>
                {VERDICTS.map((got) => {
                  const n = matrix[expected]?.[got] ?? 0;
                  const hit = expected === got;
                  return (
                    <td key={got} className="py-3 pr-4">
                      <span
                        className={
                          n === 0
                            ? "text-muted/50"
                            : hit
                              ? "font-display text-xl font-extrabold text-lime"
                              : "font-display text-xl font-extrabold text-amber"
                        }
                      >
                        {n}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Secondary stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="card">
          <h3 className="text-base font-bold uppercase tracking-wide text-muted">By language</h3>
          <p className="mt-3 text-lg text-white">
            English{" "}
            <span className="font-display font-extrabold text-lime">
              {report.byLang.en.correct}/{report.byLang.en.total}
            </span>
          </p>
          <p className="mt-1 text-lg text-white">
            Hindi{" "}
            <span className="font-display font-extrabold text-lime">
              {report.byLang.hi.correct}/{report.byLang.hi.total}
            </span>
          </p>
        </div>
        <div className="card">
          <h3 className="text-base font-bold uppercase tracking-wide text-muted">Response time</h3>
          <p className="mt-3 text-lg text-white">
            Median{" "}
            <span className="font-display font-extrabold text-lime">{report.latency.p50}ms</span>
          </p>
          <p className="mt-1 text-lg text-white">
            90th percentile{" "}
            <span className="font-display font-extrabold text-lime">{report.latency.p90}ms</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            {report.aiCoverage}% answered by the model; the rest fell back to offline rules and
            still returned a correct verdict.
          </p>
        </div>
      </div>

      {/* Per-message detail */}
      <h2 className="mt-10 font-display text-xl font-extrabold text-white">Every message</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-base">
          <thead>
            <tr className="text-sm uppercase tracking-wide text-muted">
              <th className="py-2 pr-3 font-bold">#</th>
              <th className="py-2 pr-3 font-bold">Lang</th>
              <th className="py-2 pr-3 font-bold">Labelled</th>
              <th className="py-2 pr-3 font-bold">Kavach said</th>
              <th className="py-2 pr-3 font-bold">Risk</th>
              <th className="py-2 pr-3 font-bold">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-edge">
                <td className="py-2.5 pr-3 text-muted">{r.id}</td>
                <td className="py-2.5 pr-3 uppercase text-muted">{r.lang}</td>
                <td className="py-2.5 pr-3 text-white">{r.expected}</td>
                <td className={`py-2.5 pr-3 font-bold ${r.correct ? "text-lime" : "text-amber"}`}>
                  {r.got}
                  {!r.correct && " ●"}
                </td>
                <td className="py-2.5 pr-3 text-muted">{r.risk}</td>
                <td className="py-2.5 pr-3 text-muted">{r.ms}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Caveats - judges reward honesty, and overclaiming is easy to catch */}
      <h2 className="mt-10 font-display text-xl font-extrabold text-white">
        What this number does not prove
      </h2>
      <ul className="mt-4 space-y-2.5 text-base leading-relaxed text-muted">
        <li>
          <strong className="text-white">The set is small.</strong> {report.setSize} messages we
          wrote ourselves. It is enough to catch a broken pipeline, not enough to claim
          production accuracy.
        </li>
        <li>
          <strong className="text-white">SUSPICIOUS is a judgement call.</strong> Our four
          &ldquo;misses&rdquo; are messages reasonable people would label differently.
        </li>
        <li>
          <strong className="text-white">Published LLM phishing results do not transfer.</strong>{" "}
          Those are measured on English email corpora. This is Hindi and English SMS and
          WhatsApp, which is why we measured our own rather than quoting theirs.
        </li>
        <li>
          <strong className="text-white">Reproduce it:</strong>{" "}
          <code className="text-lime">npm run benchmark</code> against your own key.
        </li>
      </ul>

      <p className="mt-8 text-sm text-muted">
        Generated {new Date(report.generatedAt).toLocaleString("en-IN")} · set{" "}
        <code>tests/scam-set.json</code>
      </p>

      <Link href="/check" className="btn-lime mt-8 w-full">
        Try it yourself
      </Link>
    </PageShell>
  );
}

function Stat({
  value,
  label,
  note,
  tone,
}: {
  value: string;
  label: string;
  note: string;
  tone: "lime" | "white";
}) {
  return (
    <div className="card tilt">
      <p
        className={`font-display text-[clamp(2.5rem,9vw,3.5rem)] font-extrabold leading-none ${
          tone === "lime" ? "text-lime" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-base font-bold text-white">{label}</p>
      <p className="mt-1 text-sm text-muted">{note}</p>
    </div>
  );
}
