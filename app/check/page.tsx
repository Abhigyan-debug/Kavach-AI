"use client";

import { useCallback, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { PageShell } from "../components/Chrome";
import { SAMPLES } from "@/lib/samples";
import type { CheckResult, Verdict } from "@/lib/schema";
import { useSpeechInput, useSpeech } from "@/lib/speech";

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

  // Voice in: an elder can speak the message instead of typing it.
  const onDictated = useCallback((spoken: string) => {
    setText((prev) => (prev ? `${prev} ${spoken}` : spoken));
  }, []);
  const mic = useSpeechInput(lang, onDictated);

  // Voice out: and hear the verdict instead of reading it.
  const tts = useSpeech(lang);

  /** Reads the verdict, the reasons and the actions, in that order. */
  function readResultAloud(r: CheckResponse) {
    const parts = [
      t.verdicts[r.verdict],
      ...r.reasons,
      t.check.doNow,
      ...r.do_now,
    ];
    tts.speak(parts.join(". "));
  }

  async function runCheck(payload: Record<string, unknown>) {
    mic.stop();
    tts.stop();
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
          {mic.supported && (
            <button
              type="button"
              onClick={mic.listening ? mic.stop : mic.start}
              disabled={busy}
              aria-pressed={mic.listening}
              className={
                mic.listening
                  ? "inline-flex min-h-[56px] items-center justify-center gap-2 rounded-pill bg-danger px-6 text-base font-extrabold text-white"
                  : "btn-ghost gap-2"
              }
            >
              <MicIcon active={mic.listening} />
              {mic.listening ? t.check.listening : t.check.speak}
            </button>
          )}
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
        {mic.listening && (
          <p className="mt-3 flex items-center gap-2 text-base text-muted" aria-live="polite">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" aria-hidden />
            {mic.interim || t.check.listening}
          </p>
        )}
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
          className={`animate-rise-3d mt-8 rounded-3xl border-4 ${VERDICT_STYLE[result.verdict].ring} bg-raised/80 p-6 outline-none backdrop-blur sm:p-8`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              className={`font-display text-[clamp(2rem,8vw,3.25rem)] font-extrabold leading-none ${VERDICT_STYLE[result.verdict].text}`}
            >
              {t.verdicts[result.verdict]}
            </p>
            {tts.supported && (
              <button
                type="button"
                onClick={() => (tts.speaking ? tts.stop() : readResultAloud(result))}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-pill border-2 border-edge px-5 text-base font-bold text-white transition hover:border-lime hover:text-lime"
              >
                <SpeakerIcon active={tts.speaking} />
                {tts.speaking ? t.check.stopReading : t.check.readAloud}
              </button>
            )}
          </div>

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

          {(result.verdict === "SCAM" || result.risk_score >= 45) && (
            <div className="mt-6 rounded-2xl border-2 border-amber/50 bg-amber/5 p-5">
              <h2 className="font-display text-xl font-extrabold text-amber">
                {t.check.actTitle}
              </h2>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {/* tel: opens the dialer pre-filled - on a phone this is one tap. */}
                <a
                  href="tel:1930"
                  className="inline-flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-pill bg-amber px-6 text-lg font-extrabold text-ink transition hover:brightness-110 active:scale-[0.98]"
                >
                  <PhoneIcon />
                  {t.check.call1930}
                </a>
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[56px] flex-1 items-center justify-center rounded-pill border-2 border-amber px-6 text-base font-bold text-amber transition hover:bg-amber hover:text-ink"
                >
                  {t.check.reportOnline}
                </a>
              </div>
            </div>
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

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "animate-pulse" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
    </svg>
  );
}

function SpeakerIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4Z" />
      {active ? (
        <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
      ) : (
        <path d="M15.5 9a4 4 0 0 1 0 6" />
      )}
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5L17 13l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 5.2 2 2 0 0 1 5.5 3Z" />
    </svg>
  );
}
