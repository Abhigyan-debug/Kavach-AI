"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { PageShell } from "../components/Chrome";
import { HELPER_MAX_TURNS, type DrillMessage } from "@/lib/schema";
import { recordPractice } from "@/lib/streak";

type Phase = "intro" | "chat" | "done";

export default function HelperPage() {
  const { lang, toggle, t } = useLang();
  const [phase, setPhase] = useState<Phase>("intro");
  const [messages, setMessages] = useState<DrillMessage[]>([]);
  const [conviction, setConviction] = useState(85);
  const [moves, setMoves] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const turn = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function start() {
    setPhase("chat");
    setMessages([]);
    setMoves([]);
    setConviction(85);
    setSaved(false);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/helper/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMessages([{ role: "scammer", text: d.reply }]);
      setConviction(d.conviction);
    } catch {
      setError(t.check.error);
      setPhase("intro");
    } finally {
      setBusy(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || busy) return;

    const history = messages;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/helper/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, userMessage: trimmed, conviction, lang }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);

      setMessages((m) => [...m, { role: "scammer", text: d.reply }]);
      setConviction(d.conviction);
      if (d.moved_because) setMoves((x) => [...x, d.moved_because]);
      if (d.done) {
        setSaved(Boolean(d.saved));
        recordPractice();
        setPhase("done");
      }
    } catch {
      setError(t.check.error);
    } finally {
      setBusy(false);
    }
  }

  // Green when she is coming round, red while she is still convinced.
  const beliefTone =
    conviction <= 30 ? "bg-lime" : conviction <= 60 ? "bg-amber" : "bg-danger";

  return (
    <PageShell t={t} lang={lang} onToggle={toggle}>
      <h1 className="font-display text-[clamp(2rem,7vw,3rem)] font-extrabold leading-tight text-white">
        {t.helper.title}
      </h1>
      <p className="mt-3 text-lg text-muted">{t.helper.sub}</p>

      {error && (
        <p role="alert" className="mt-6 rounded-2xl border-2 border-danger bg-danger/10 p-4 text-lg font-semibold text-danger">
          {error}
        </p>
      )}

      {phase === "intro" && (
        <section className="mt-8 animate-rise">
          <div className="card tilt">
            <h2 className="font-display text-xl font-extrabold text-lime">{t.helper.why}</h2>
            <p className="mt-2.5 text-base leading-relaxed text-muted">{t.helper.whyBody}</p>
          </div>
          <button type="button" onClick={start} disabled={busy} className="btn-lime mt-6 w-full">
            {busy ? t.common.loading : t.helper.start}
          </button>
        </section>
      )}

      {(phase === "chat" || phase === "done") && (
        <section className="mt-8">
          {/* Belief meter - the thing the user is actually trying to move. */}
          <div className="card sticky top-20 z-10">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-semibold text-muted">{t.helper.belief}</span>
              <span className="font-display text-2xl font-extrabold text-white tabular-nums">
                {conviction}%
              </span>
            </div>
            <div className="mt-2.5 h-3.5 overflow-hidden rounded-pill bg-ink">
              <div
                className={`h-full rounded-pill ${beliefTone} transition-all duration-700 ease-out`}
                style={{ width: `${conviction}%` }}
              />
            </div>
            {phase === "chat" && (
              <p className="mt-2 text-sm text-muted">
                {t.helper.turn} {Math.min(turn + 1, HELPER_MAX_TURNS)} / {HELPER_MAX_TURNS}
              </p>
            )}
          </div>

          <div className="mt-5 space-y-3" role="log" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <p
                  className={
                    m.role === "user"
                      ? "animate-rise max-w-[85%] rounded-3xl rounded-br-lg bg-lime px-5 py-3.5 text-lg font-medium text-ink"
                      : "animate-rise max-w-[85%] rounded-3xl rounded-bl-lg border-2 border-edge bg-raised px-5 py-3.5 text-lg text-white"
                  }
                >
                  {m.text}
                </p>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <p className="rounded-3xl rounded-bl-lg border-2 border-edge bg-raised px-5 py-3.5 text-lg text-muted">
                  <span className="dots" aria-label={t.common.loading} />
                </p>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {phase === "chat" && (
            <>
              <form onSubmit={send} className="mt-5 flex flex-col gap-3 sm:flex-row">
                <label htmlFor="reply" className="sr-only">
                  {t.helper.placeholder}
                </label>
                <input
                  id="reply"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t.helper.placeholder}
                  maxLength={1000}
                  disabled={busy}
                  className="field flex-1"
                />
                <button type="submit" disabled={busy || !input.trim()} className="btn-lime">
                  {t.helper.send}
                </button>
              </form>
              <p className="mt-4 text-sm text-muted">{t.helper.hint}</p>
            </>
          )}
        </section>
      )}

      {phase === "done" && (
        <section className="mt-8 animate-rise">
          <div className={`card ${saved ? "border-lime" : "border-amber"}`}>
            <h2
              className={`font-display text-[clamp(1.75rem,6vw,2.5rem)] font-extrabold leading-tight ${
                saved ? "text-lime" : "text-amber"
              }`}
            >
              {saved ? t.helper.savedTitle : t.helper.lostTitle}
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-white">
              {saved ? t.helper.savedBody : t.helper.lostBody}
            </p>

            {moves.length > 0 && (
              <div className="mt-6">
                <h3 className="text-base font-bold uppercase tracking-wide text-muted">
                  {t.helper.whatWorked}
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {moves.map((m, i) => (
                    <li key={i} className="flex gap-3 text-base leading-relaxed text-white">
                      <span className="text-lime" aria-hidden>
                        →
                      </span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button type="button" onClick={start} className="btn-lime mt-5 w-full">
            {t.helper.again}
          </button>
        </section>
      )}
    </PageShell>
  );
}
