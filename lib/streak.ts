"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Practice streak.
 *
 * Inoculation research is consistent that protection decays without repetition
 * (Maertens et al. 2020), so the product needs a reason to come back, not just
 * a good first session. Kept in localStorage: it is a personal nudge, not data
 * worth a database row, and it must survive with no account.
 */
const KEY = "kavach.streak";

type State = { count: number; lastISO: string | null };

const EMPTY: State = { count: 0, lastISO: null };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a);
  return Math.round(ms / 86_400_000);
}

function read(): State {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as State;
    if (typeof parsed?.count !== "number") return EMPTY;
    return parsed;
  } catch {
    // Private mode, blocked storage, corrupt value - a streak is never worth
    // breaking the page over.
    return EMPTY;
  }
}

function write(s: State) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** Call when a drill or helper session completes. Idempotent within a day. */
export function recordPractice(): State {
  if (typeof window === "undefined") return EMPTY;
  const prev = read();
  const day = today();

  if (prev.lastISO === day) return prev; // already counted today

  const gap = prev.lastISO ? daysBetween(prev.lastISO, day) : Infinity;
  // Yesterday continues the streak; a longer gap restarts it at 1.
  const next: State = { count: gap === 1 ? prev.count + 1 : 1, lastISO: day };
  write(next);
  return next;
}

export function useStreak() {
  const [state, setState] = useState<State>(EMPTY);
  const [ready, setReady] = useState(false);

  // After mount only, so server and client first render agree.
  useEffect(() => {
    setState(read());
    setReady(true);
  }, []);

  const refresh = useCallback(() => setState(read()), []);

  const day = today();
  const practisedToday = state.lastISO === day;
  const gap = state.lastISO ? daysBetween(state.lastISO, day) : Infinity;
  // A streak that has already been broken should not still be advertised.
  const live = gap <= 1 ? state.count : 0;
  /** True once it has been long enough that the booster is the honest nudge. */
  const boosterDue = state.lastISO !== null && gap >= 7;

  return { ready, streak: live, practisedToday, boosterDue, refresh };
}
