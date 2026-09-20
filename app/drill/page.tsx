"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { PageShell } from "../components/Chrome";
import { SCENARIOS, type DrillMessage, type DrillScore, type Scenario } from "@/lib/schema";

type Phase = "pick" | "chat" | "scoring" | "score";

const MAX_TURNS = 8;

export default function DrillPage() {
  const { lang, toggle, t } = useLang();
  const [phase, setPhase] = useState<Phase>("pick");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<DrillMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [broke, setBroke] = useState(false);
  const [score, setScore] = useState<(DrillScore & { cuesTotal: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  /**
   * Scoring costs a few seconds. Rather than spend them after the user taps
   * "hang up", we start the request the moment the drill ends and let it run
   * while they read the scammer's last message. By the time they tap, the
   * result is usually already here.
   */
  const pendingScore = useRef<Promise<DrillScore & { cuesTotal: number }> | null>(null);

  const requestScore = useCallback(
    (sc: Scenario, transcript: DrillMessage[]) => {
      const p = (async () => {
        const res = await fetch("/api/drill/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario: sc, transcript, lang }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "score failed");
        return data as DrillScore & { cuesTotal: number };
      })();
      // Attach a no-op catch so an early failure is not an unhandled rejection;
      // finish() awaits the same promise and surfaces the error properly.
      p.catch(() => {});
      pendingScore.current = p;
    },
    [lang],
  );

  const userTurns = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function start(picked: Scenario) {
    setScenario(picked);
    setPhase("chat");
    setMessages([]);
    setDone(false);
    setBroke(false);
    setScore(null);
    setError(null);
    pendingScore.current = null;
    setBusy(true);
    try {
      const res = await fetch("/api/drill/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: picked, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages([{ role: "scammer", text: data.firstMessage }]);
    } catch {
      setError(t.check.error);
      setPhase("pick");
    } finally {
      setBusy(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || busy || done || !scenario) return;

    const history = messages;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/drill/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, history, userMessage: trimmed, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const finalTranscript: DrillMessage[] = [
        ...history,
        { role: "user", text: trimmed },
        { role: "scammer", text: data.reply },
      ];
      setMessages(finalTranscript);
      if (data.breakCharacter) setBroke(true);
      if (data.done) {
        setDone(true);
        // Runs while the user reads the reply above.
        requestScore(scenario, finalTranscript);
      }
    } catch {
      setError(t.check.error);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!scenario) return;
    setPhase("scoring");
    // Hanging up early means there is no prefetch yet - start one now.
    if (!pendingScore.current) requestScore(scenario, messages);
    try {
      const data = await pendingScore.current!;
      setScore(data);
      setPhase("score");
    } catch {
      pendingScore.current = null;
      setError(t.check.error);
      setPhase("chat");
    }
  }

  function reset() {
    setPhase("pick");
    setScenario(null);
    setMessages([]);
    setScore(null);
    setError(null);
    setDone(false);
    setBroke(false);
    pendingScore.current = null;
  }

  return (
    <PageShell t={t} lang={lang} onToggle={toggle}>
      <h1 className="font-display text-[clamp(2rem,7vw,3rem)] font-extrabold leading-tight text-white">
        {t.drill.title}
      </h1>
      <p className="mt-3 text-lg text-muted">{t.drill.sub}</p>

      {error && (
        <p role="alert" className="mt-6 rounded-2xl border-2 border-danger bg-danger/10 p-4 text-lg font-semibold text-danger">
          {error}
        </p>
      )}

      {phase === "pick" && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-extrabold text-white">{t.drill.pick}</h2>
          <p className="mt-2 text-base text-muted">{t.drill.scenarioHint}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {SCENARIOS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => start(s)}
                className="card min-h-[88px] text-left transition hover:border-lime hover:bg-raised"
              >
                <span className="font-display text-xl font-extrabold text-white">
                  {t.drill.scenarios[s]}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {phase === "chat" && scenario && (
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-pill bg-amber px-4 py-2 font-display text-sm font-extrabold uppercase tracking-widest text-ink">
              <span className="h-2 w-2 rounded-full bg-ink" aria-hidden />
              {t.drill.simulation}
            </span>
            <span className="text-base font-semibold text-muted">
              {t.drill.turn} {Math.min(userTurns + 1, MAX_TURNS)} {t.drill.of} {MAX_TURNS}
            </span>
          </div>

          <div className="mt-5 space-y-3" role="log" aria-live="polite">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <p
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-3xl rounded-br-lg bg-lime px-5 py-3.5 text-lg font-medium text-ink"
                      : "max-w-[85%] rounded-3xl rounded-bl-lg border-2 border-edge bg-raised px-5 py-3.5 text-lg text-white"
                  }
                >
                  {m.text}
                </p>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <p className="rounded-3xl rounded-bl-lg border-2 border-edge bg-raised px-5 py-3.5 text-lg text-muted">
                  {t.drill.thinking}
                </p>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {broke && (
            <p className="mt-4 rounded-2xl border-2 border-amber bg-amber/10 p-4 text-base font-semibold text-amber">
              {t.drill.breakCharacter} — {t.drill.safetyNote}
            </p>
          )}

          {!done && (
            <form onSubmit={send} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <label htmlFor="reply" className="sr-only">
                {t.drill.placeholder}
              </label>
              <input
                id="reply"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.drill.placeholder}
                maxLength={1000}
                disabled={busy}
                className="field flex-1"
              />
              <button type="submit" disabled={busy || !input.trim()} className="btn-lime">
                {t.drill.send}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={finish}
            disabled={messages.length < 2}
            className="btn-outline mt-4 w-full"
          >
            {t.drill.hangUp}
          </button>

          <p className="mt-4 text-sm text-muted">{t.drill.safetyNote}</p>
        </section>
      )}

      {phase === "scoring" && (
        <section className="mt-8" aria-live="polite" aria-busy="true">
          <div className="card border-lime/50">
            <h2 className="font-display text-xl font-extrabold text-white">{t.drill.scoring}</h2>
            <p className="mt-2 text-base text-muted">{t.drill.scoringSub}</p>

            <div className="mt-6 flex items-end gap-3">
              <div className="h-20 w-36 animate-pulse rounded-2xl bg-edge/60" />
              <div className="h-8 w-16 animate-pulse rounded-full bg-edge/40" />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[0, 1].map((col) => (
                <div key={col}>
                  <div className="h-4 w-32 animate-pulse rounded-full bg-edge/50" />
                  <div className="mt-3 space-y-2.5">
                    <div className="h-4 w-full animate-pulse rounded-full bg-edge/35" />
                    <div className="h-4 w-4/5 animate-pulse rounded-full bg-edge/35" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border-2 border-lime/30 bg-lime/5 p-5">
              <div className="h-4 w-28 animate-pulse rounded-full bg-edge/50" />
              <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-edge/35" />
            </div>
          </div>
        </section>
      )}

      {phase === "score" && score && (
        <section className="mt-8">
          <div className="card border-lime">
            <h2 className="font-display text-xl font-extrabold text-white">{t.drill.scoreTitle}</h2>
            <p className="mt-3 font-display text-[clamp(3.5rem,16vw,6rem)] font-extrabold leading-none text-lime">
              {score.score}
              <span className="text-3xl text-muted">/100</span>
            </p>

            <p className="mt-4 text-lg font-semibold text-white">{score.encouragement}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-base font-bold uppercase tracking-wide text-lime">
                  {t.drill.caught}
                </h3>
                <ul className="mt-2.5 space-y-2">
                  {score.caught.length === 0 && <li className="text-base text-muted">—</li>}
                  {score.caught.map((c, i) => (
                    <li key={i} className="flex gap-2.5 text-base leading-relaxed text-white">
                      <span className="text-lime" aria-hidden>
                        ✓
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-base font-bold uppercase tracking-wide text-amber">
                  {t.drill.missed}
                </h3>
                <ul className="mt-2.5 space-y-2">
                  {score.missed.length === 0 && <li className="text-base text-muted">—</li>}
                  {score.missed.map((c, i) => (
                    <li key={i} className="flex gap-2.5 text-base leading-relaxed text-white">
                      <span className="text-amber" aria-hidden>
                        !
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border-2 border-lime/40 bg-lime/5 p-5">
              <h3 className="font-display text-lg font-extrabold text-lime">{t.drill.lesson}</h3>
              <p className="mt-2 text-lg leading-relaxed text-white">{score.lesson}</p>
            </div>
          </div>

          <button type="button" onClick={reset} className="btn-lime mt-5 w-full">
            {t.drill.again}
          </button>
        </section>
      )}
    </PageShell>
  );
}
