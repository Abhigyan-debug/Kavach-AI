"use client";

import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { PageShell } from "../components/Chrome";
import type { AlertRow, DrillRow } from "@/lib/db";
import type { Verdict } from "@/lib/schema";

const VERDICT_STYLE: Record<Verdict, string> = {
  SAFE: "border-lime text-lime",
  SUSPICIOUS: "border-amber text-amber",
  SCAM: "border-danger text-danger",
};

export default function FamilyPage() {
  const { lang, toggle, t } = useLang();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [drills, setDrills] = useState<DrillRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alert", { cache: "no-store" });
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setDrills(data.drills ?? []);
    } catch {
      /* leave the previous list in place */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(id: string) {
    // Optimistic: the guardian sees it move immediately.
    setAlerts((rows) => rows.map((r) => (r.id === id ? { ...r, resolved: true } : r)));
    await fetch("/api/alert", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <PageShell t={t} lang={lang} onToggle={toggle}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,7vw,3rem)] font-extrabold leading-tight text-white">
            {t.family.title}
          </h1>
          <p className="mt-3 text-lg text-muted">{t.family.sub}</p>
        </div>
        <button type="button" onClick={load} className="btn-ghost">
          {t.family.refresh}
        </button>
      </div>

      <section className="mt-8 space-y-4">
        {loading && alerts.length === 0 && (
          <div className="card animate-pulse">
            <div className="h-6 w-1/3 rounded-full bg-edge/60" />
            <div className="mt-4 h-4 w-full rounded-full bg-edge/40" />
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div className="card text-center">
            <p className="font-display text-2xl font-extrabold text-lime">✓</p>
            <p className="mt-2 text-lg text-muted">{t.family.none}</p>
          </div>
        )}

        {alerts.map((alert) => (
          <article
            key={alert.id}
            className={`rounded-3xl border-4 bg-raised/70 p-6 backdrop-blur ${
              VERDICT_STYLE[alert.verdict]
            } ${alert.resolved ? "opacity-55" : ""}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className={`font-display text-2xl font-extrabold ${VERDICT_STYLE[alert.verdict]}`}>
                {t.verdicts[alert.verdict]}
              </p>
              <p className="text-base font-semibold text-muted">
                {t.family.riskLabel} {alert.risk_score}/100
              </p>
            </div>

            <p className="mt-1 text-base font-semibold text-white">{alert.elder_name}</p>
            <p className="mt-3 text-lg leading-relaxed text-white">{alert.summary}</p>

            {alert.tactics.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {alert.tactics.map((tactic) => (
                  <span key={tactic} className="chip">
                    {tactic}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-4 text-sm text-muted">
              {new Date(alert.created_at).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN")}
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {/* tel: with no number opens the dialer - the guardian picks the contact. */}
              <a href="tel:" className="btn-lime flex-1">
                {t.family.call}
              </a>
              {alert.resolved ? (
                <span className="inline-flex min-h-[56px] flex-1 items-center justify-center rounded-pill border-2 border-edge px-6 text-base font-bold text-muted">
                  ✓ {t.family.resolved}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => resolve(alert.id)}
                  className="btn-ghost flex-1"
                >
                  {t.family.resolve}
                </button>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-extrabold text-white">{t.family.drills}</h2>
        {drills.length === 0 ? (
          <p className="mt-3 text-base text-muted">{t.family.noDrills}</p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {drills.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-4 rounded-2xl border-2 border-edge bg-raised/50 px-5 py-4"
              >
                <span className="text-base font-semibold text-white">
                  {t.drill.scenarios[d.scenario]}
                </span>
                <span className="font-display text-xl font-extrabold text-lime">
                  {d.score}
                  <span className="text-base text-muted">/100</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
