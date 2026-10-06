import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { localeStore } from "@/lib/secureStore";
import { en, type Translations } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { pt } from "./pt";
import { zh } from "./zh";

// The storefront also ships Arabic; it stays out here because RTL means
// reworking every layout, not just translating.
export type Locale = "en" | "es" | "pt" | "fr" | "zh";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "fr", label: "Français" },
  { value: "zh", label: "中文" },
];

const dictionaries: Record<Locale, Translations> = { en, es, pt, fr, zh };

// BCP-47 tags for Intl: dates and numbers follow the chosen language, and the
// storefront already formats Spanish as es-AR.
export const dateLocale: Record<Locale, string> = {
  en: "en-US",
  es: "es-AR",
  pt: "pt-BR",
  fr: "fr-FR",
  zh: "zh-CN",
};

const isLocale = (value: string | null): value is Locale =>
  !!value && value in dictionaries;

// Hermes ships Intl, so the device language comes for free — no expo-localization
// dependency just to read it once at startup.
function deviceLocale(): Locale {
  try {
    const tag = new Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    const base = tag.split("-")[0];
    return isLocale(base) ? base : "en";
  } catch {
    return "en";
  }
}

type I18nContextValue = {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Starts on the device language and switches once the stored choice loads;
  // the swap is a single re-render before the first screen settles.
  const [locale, setLocaleState] = useState<Locale>(deviceLocale);

  useEffect(() => {
    let cancelled = false;
    localeStore
      .get()
      .then((stored) => {
        if (!cancelled && isLocale(stored)) setLocaleState(stored);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localeStore.set(next).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ locale, t: dictionaries[locale], setLocale }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

/** Shorthand for screens that only need the strings. */
export const useT = () => useI18n().t;

/** Fills {placeholders} in a translated string. */
export const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match
  );
