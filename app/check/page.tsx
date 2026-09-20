"use client";

import { useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { PageShell } from "../components/Chrome";
import { SAMPLES } from "@/lib/samples";
import type { CheckResult, Verdict } from "@/lib/schema";

type CheckResponse = CheckResult & { source: "ai" | "rules"; note?: string };

const VERDICT_STYLE: Record<Verdict, { ring: string; text: string; bar: string }> = {
  SAFE: { ring: "border-lime", text: "text-lime", bar: "bg-lime" },
  SUSPICIOUS: { ring: "border-amber", text: "text-amber", bar: "bg-amber" },
  SCAM: { ring: "border-danger", text: "text-danger", bar: "bg-danger" },
};

export default function CheckPage() {
  const { lang, toggle, t } = useLang();
  const [text, setText] = useState("");
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<"idle" | "sending" | "sent">("idle");
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function runCheck(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setResult(null);
    setAlertState("idle");
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, lang }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data: CheckResponse = await res.json();
      setResult(data);
      // Move focus to the verdict so a screen reader announces it.
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch {
      setError(t.check.error);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError(t.check.empty);
      return;
    }
    void runCheck({ text: text.trim() });
  }

  function onSample(i: number) {
    const sample = SAMPLES[i][lang];
    setText(sample);
    void runCheck({ text: sample });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4_500_000) {
      setError("That image is too large. Please use one under 4 MB.");
      return;
    }
    const buf = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    setText("");
    void runCheck({ imageBase64: base64, imageMediaType: file.type });
  }

  async function onAlertFamily() {
    if (!result) return;
    setAlertState("sending");
    try {
      await fetch("/api/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verdict: result.verdict,
          risk_score: result.risk_score,
          tactics: result.tactics,
          // Only the reason summary crosses the wire, never the raw message.
          summary: result.reasons.join(". "),
        }),
      });
      setAlertState("sent");
    } catch {
      setAlertState("idle");
      setError(t.check.error);
    }
  }

  return (
    <PageShell t={t} lang={lang} onToggle={toggle}>
      <h1 className="font-display text-[clamp(2rem,7vw,3rem)] font-extrabold leading-tight text-white">
        {t.check.title}
      </h1>
      <p className="mt-3 text-lg text-muted">{t.check.sub}</p>

      <form onSubmit={onSubmit} className="mt-7">
        <label htmlFor="message" className="sr-only">
          {t.check.placeholder}
        </label>
        <textarea
          id="message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.check.placeholder}
          rows={6}
          maxLength={4000}
          className="field resize-y"
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={busy} className="btn-lime flex-1">
            {busy ? t.check.checking : t.check.button}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="btn-ghost"
          >
            {t.check.screenshot}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onFile}
            className="hidden"
          />
        </div>
      </form>

      {/* One-tap samples so a live demo never depends on typing. */}
      <div className="mt-7">
        <p className="text-base font-semibold text-muted">{t.check.samples}</p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {t.check.sampleLabels.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => onSample(i)}
              disabled={busy}
              className="min-h-[48px] rounded-pill border-2 border-edge px-5 text-base font-bold text-white transition hover:border-lime hover:text-lime disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-2xl border-2 border-danger bg-danger/10 p-4 text-lg font-semibold text-danger">
          {error}
        </p>
      )}

      {busy && (
        <div className="mt-8 card animate-pulse">
          <div className="h-8 w-2/3 rounded-full bg-edge/60" />
          <div className="mt-4 h-4 w-full rounded-full bg-edge/40" />
          <div className="mt-2.5 h-4 w-5/6 rounded-full bg-edge/40" />
        </div>
      )}

      {result && (
        <div
          ref={resultRef}
          tabIndex={-1}
          aria-live="polite"
          className={`mt-8 rounded-3xl border-4 ${VERDICT_STYLE[result.verdict].ring} bg-raised/80 p-6 outline-none backdrop-blur sm:p-8`}
        >
          <p
            className={`font-display text-[clamp(2rem,8vw,3.25rem)] font-extrabold leading-none ${VERDICT_STYLE[result.verdict].text}`}
          >
            {t.verdicts[result.verdict]}
          </p>

          {/* Risk meter */}
          <div className="mt-5">
            <div className="flex items-baseline justify-between text-base font-semibold text-muted">
              <span>{t.check.riskLabel}</span>
              <span className={`font-display text-2xl font-extrabold ${VERDICT_STYLE[result.verdict].text}`}>
                {result.risk_score}/100
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-pill bg-ink">
              <div
                className={`h-full rounded-pill ${VERDICT_STYLE[result.verdict].bar} transition-all duration-700`}
                style={{ width: `${result.risk_score}%` }}
              />
            </div>
          </div>

          {result.tactics.length > 0 && (
            <div className="mt-6">
              <h2 className="text-base font-bold uppercase tracking-wide text-muted">
                {t.check.tactics}
              </h2>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {result.tactics.map((tactic) => (
                  <span key={tactic} className="chip">
                    {tactic}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <h2 className="font-display text-xl font-extrabold text-white">{t.check.why}</h2>
            <ul className="mt-3 space-y-2.5">
              {result.reasons.map((reason, i) => (
                <li key={i} className="flex gap-3 text-lg leading-relaxed text-white">
                  <span className={VERDICT_STYLE[result.verdict].text} aria-hidden>
                    •
                  </span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-2xl border-2 border-lime/40 bg-lime/5 p-5">
            <h2 className="font-display text-xl font-extrabold text-lime">{t.check.doNow}</h2>
            <ol className="mt-3 space-y-2.5">
              {result.do_now.map((step, i) => (
                <li key={i} className="flex gap-3 text-lg leading-relaxed text-white">
                  <span className="font-display font-extrabold text-lime" aria-hidden>
                    {i + 1}.
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {result.family_alert_recommended && (
            <button
              type="button"
              onClick={onAlertFamily}
              disabled={alertState !== "idle"}
              className="btn-lime mt-6 w-full"
            >
              {alertState === "idle" && t.check.alertFamily}
              {alertState === "sending" && t.check.alerting}
              {alertState === "sent" && `✓ ${t.check.alerted}`}
            </button>
          )}

          <p className="mt-6 border-t border-edge pt-4 text-base font-semibold text-amber">
            {t.check.helpline}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t.check.disclaimer}</p>
          {result.source === "rules" && (
            <p className="mt-2 text-sm text-muted/80">{t.check.fallbackNote}</p>
          )}
        </div>
      )}
    </PageShell>
  );
}
