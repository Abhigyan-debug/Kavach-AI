"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { PageShell } from "../components/Chrome";
import { Telemetry } from "../components/hud/Telemetry";
import type { Verdict } from "@/lib/schema";
import report from "@/public/benchmark.json";

type Row = {
  id: number;
  lang: string;
  expected: Verdict;
  got: Verdict;
  risk: number;
  source: string;
  ms: number;
  correct: boolean;
};

const VERDICTS: Verdict[] = ["SCAM", "SUSPICIOUS", "SAFE"];

/** Replace {name} placeholders in a translated sentence. */
const fill = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));

const seconds = (ms: number) => (ms / 1000).toFixed(1);

export default function BenchmarkPage() {
  const { lang, toggle, t } = useLang();
  const b = t.bench;
  const rows = report.results as Row[];
  const matrix = report.matrix as Record<string, Record<string, number>>;

  // Every number in the text comes from the data, so the wording stays true
  // if the benchmark is re-run.
  const rowTotal = (v: Verdict) => VERDICTS.reduce((sum, g) => sum + (matrix[v]?.[g] ?? 0), 0);
  const total = report.setSize;
  const misses = total - report.correct;
  const backup = rows.filter((r) => r.source === "rules");
  const backupRight = backup.filter((r) => r.correct).length;
  const langName = (code: string) => (code === "hi" ? b.hindi : b.english);
  const lastTested = new Date(report.generatedAt).toLocaleDateString(
    lang === "hi" ? "hi-IN" : "en-IN",
    // Fixed zone: the server (UTC) and the browser (IST) must print the same date.
    { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" },
  );

  return (
    <PageShell t={t} lang={lang} onToggle={toggle}>
      <Telemetry align="start">{b.chip}</Telemetry>
      <h1 className="mt-4 font-display text-[clamp(2rem,7vw,3rem)] font-extrabold leading-tight text-white">
        {b.title}
      </h1>
      <p className="mt-3 text-lg text-muted">{fill(b.sub, { total })}</p>

      {/* The safety numbers come first: catching scams matters most. */}
      <div className="stagger mt-8 grid gap-4 sm:grid-cols-3">
        <Stat
          value={`${report.scamRecall}%`}
          label={b.caughtLabel}
          note={fill(b.caughtNote, { n: rowTotal("SCAM") })}
          tone="lime"
        />
        <Stat
          value={String(report.falseAlarms.length)}
          label={b.calmLabel}
          note={fill(b.calmNote, { n: rowTotal("SAFE") })}
          tone="lime"
        />
        <Stat
          value={`${report.accuracy}%`}
          label={b.rightLabel}
          note={fill(b.rightNote, { correct: report.correct, total })}
          tone="white"
        />
      </div>

      <div className="mt-6 rounded-2xl border-2 border-lime/40 bg-lime/5 p-5">
        <h2 className="font-display text-lg font-extrabold text-lime">{b.whyTitle}</h2>
        <p className="mt-2 text-base leading-relaxed text-white">{fill(b.whyBody, { n: misses })}</p>
      </div>

      {/* Agreement table, with verdicts in the same words the Check page uses. */}
      <h2 className="mt-10 font-display text-xl font-extrabold text-white">{b.tableTitle}</h2>
      <p className="mt-2 text-base text-muted">{b.tableHint}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[460px] border-collapse text-left">
          <thead>
            <tr className="text-sm text-muted">
              <th className="py-2 pr-4 font-bold">{b.ourAnswer} ↓</th>
              {VERDICTS.map((v) => (
                <th key={v} className="py-2 pr-4 font-bold">
                  {b.kavachSaid}: {t.verdicts[v]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VERDICTS.map((expected) => (
              <tr key={expected} className="border-t border-edge">
                <td className="py-3 pr-4 text-base font-bold text-white">{t.verdicts[expected]}</td>
                {VERDICTS.map((got) => {
                  const n = matrix[expected]?.[got] ?? 0;
                  return (
                    <td key={got} className="py-3 pr-4">
                      <span
                        className={
                          n === 0
                            ? "text-muted/50"
                            : expected === got
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="card">
          <h3 className="font-display text-lg font-extrabold text-white">{b.langTitle}</h3>
          {(["en", "hi"] as const).map((code) => (
            <p key={code} className="mt-2 text-lg text-white">
              {fill(b.langRow, {
                lang: langName(code),
                correct: report.byLang[code].correct,
                total: report.byLang[code].total,
              })}
            </p>
          ))}
        </div>
        <div className="card">
          <h3 className="font-display text-lg font-extrabold text-white">{b.speedTitle}</h3>
          <p className="mt-2 text-lg text-white">
            {fill(b.speedBody, { typ: seconds(report.latency.p50), slow: seconds(report.latency.p90) })}
          </p>
          {backup.length > 0 && (
            <p className="mt-3 text-base text-muted">
              {fill(backupRight === backup.length ? b.backupAllRight : b.backupSome, {
                n: backup.length,
                total,
                ok: backupRight,
              })}
            </p>
          )}
        </div>
      </div>

      <h2 className="mt-10 font-display text-xl font-extrabold text-white">{b.everyTitle}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse text-left text-base">
          <thead>
            <tr className="text-sm text-muted">
              <th className="py-2 pr-3 font-bold">#</th>
              <th className="py-2 pr-3 font-bold">{b.colLang}</th>
              <th className="py-2 pr-3 font-bold">{b.colOurs}</th>
              <th className="py-2 pr-3 font-bold">{b.colKavach}</th>
              <th className="py-2 pr-3 font-bold">{b.colRisk}</th>
              <th className="py-2 pr-3 font-bold">{b.colTime}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-edge">
                <td className="py-2.5 pr-3 text-muted">{r.id}</td>
                <td className="py-2.5 pr-3 text-muted">{langName(r.lang)}</td>
                <td className="py-2.5 pr-3 text-white">{t.verdicts[r.expected]}</td>
                <td className={`py-2.5 pr-3 font-bold ${r.correct ? "text-lime" : "text-amber"}`}>
                  {t.verdicts[r.got]}
                </td>
                <td className="py-2.5 pr-3 text-muted">{r.risk}/100</td>
                <td className="py-2.5 pr-3 text-muted">{fill(b.seconds, { s: seconds(r.ms) })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stated plainly: overclaiming is easy to catch, and honesty earns trust. */}
      <h2 className="mt-10 font-display text-xl font-extrabold text-white">{b.limitsTitle}</h2>
      <ul className="mt-4 space-y-3 text-base leading-relaxed text-muted">
        <li>
          <strong className="text-white">{b.limit1Title}</strong> {fill(b.limit1, { total })}
        </li>
        <li>
          <strong className="text-white">{b.limit2Title}</strong> {fill(b.limit2, { n: misses })}
        </li>
        <li>
          <strong className="text-white">{b.limit3Title}</strong> {b.limit3}
        </li>
      </ul>

      <p className="mt-8 text-sm text-muted">
        {fill(b.lastTested, { date: lastTested })}
        <br />
        {b.devNote.split("{cmd}")[0]}
        <code className="text-lime">npm run benchmark</code>
        {b.devNote.split("{cmd}")[1]}
      </p>

      <Link href="/check" className="btn-lime mt-8 w-full">
        {b.cta}
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
