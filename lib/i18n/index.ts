"use client";

import { useCallback, useEffect, useState } from "react";
import en from "./en.json";
import hi from "./hi.json";
import type { Lang } from "../schema";

/**
 * Dictionary-based i18n. Both files share one shape, so `en` is the type source
 * and a missing Hindi key is a compile error rather than a blank string at the
 * demo.
 */
export type Dict = typeof en;

const DICTS: Record<Lang, Dict> = { en, hi: hi as Dict };

const STORAGE_KEY = "kavach.lang";

export function useLang() {
  const [lang, setLangState] = useState<Lang>("en");

  // Read the saved choice after mount so server and client render the same
  // markup on the first pass.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "hi") setLangState(saved);
    } catch {
      /* private mode - fall back to English */
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => setLang(lang === "en" ? "hi" : "en"), [lang, setLang]);

  return { lang, setLang, toggle, t: DICTS[lang] };
}

export function dict(lang: Lang): Dict {
  return DICTS[lang];
}
