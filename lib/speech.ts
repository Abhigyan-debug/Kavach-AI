"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "./schema";

/**
 * Web Speech API wrappers.
 *
 * Our primary user is an elder who may not type comfortably and may not read
 * small text, so speaking a message in and hearing the verdict back is not a
 * nice-to-have - it is the difference between the app being usable or not.
 *
 * Support is uneven (Chrome and Edge yes, Firefox no, iOS Safari partial), so
 * everything here degrades to "the button simply is not shown" rather than
 * throwing. Typing always remains available.
 */

const BCP47: Record<Lang, string> = { en: "en-IN", hi: "hi-IN" };

/* ------------------------------------------------------------------ */
/* Speech recognition (voice -> text)                                  */
/* ------------------------------------------------------------------ */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechInput(lang: Lang, onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const ref = useRef<SpeechRecognitionLike | null>(null);

  // Detect after mount: server and first client render must match.
  useEffect(() => setSupported(recognitionCtor() !== null), []);

  const stop = useCallback(() => {
    ref.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;

    // A fresh instance each time; reusing one after an error is unreliable.
    const rec = new Ctor();
    ref.current = rec;
    rec.lang = BCP47[lang];
    rec.continuous = true;
    rec.interimResults = true;

    let finalText = "";
    rec.onresult = (e) => {
      let partial = "";
      for (let i = 0; i < e.results.length; i++) {
        const alt = e.results[i][0];
        if (!alt) continue;
        // `isFinal` is not in the minimal type above; read it defensively.
        const isFinal = (e.results[i] as unknown as { isFinal?: boolean }).isFinal;
        if (isFinal) finalText += alt.transcript;
        else partial += alt.transcript;
      }
      setInterim(partial);
      if (finalText) onFinal(finalText.trim());
    };

    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [lang, onFinal]);

  useEffect(() => () => ref.current?.abort(), []);

  return { supported, listening, interim, start, stop };
}

/* ------------------------------------------------------------------ */
/* Speech synthesis (text -> voice)                                    */
/* ------------------------------------------------------------------ */

export function useSpeech(lang: Lang) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const stop = useCallback(() => {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(text);
      u.lang = BCP47[lang];
      // Slower than default: this audience is the whole reason the feature exists.
      u.rate = 0.9;
      u.pitch = 1;

      const match = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang === BCP47[lang] || v.lang.startsWith(lang));
      if (match) u.voice = match;

      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);

      setSpeaking(true);
      window.speechSynthesis.speak(u);
    },
    [lang],
  );

  return { supported, speaking, speak, stop };
}
