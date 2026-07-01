import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Locale = "en-GB" | "fr-FR" | "es-ES";

const STORAGE_KEY = "tradelike_locale";
const defaultLocale: Locale = "en-GB";
const enabledLocales: Locale[] = ["en-GB", "fr-FR", "es-ES"];

const messages: Record<Locale, Record<string, string>> = {
  "en-GB": {
    "dashboard.label": "Dashboard",
    "settings.permissions": "Permissions Matrix",
    "settings.usage": "Usage",
    "audit.title": "Audit logs",
  },
  "fr-FR": {
    "dashboard.label": "Tableau de bord",
    "settings.permissions": "Matrice des autorisations",
    "settings.usage": "Utilisation",
    "audit.title": "Journaux d'audit",
  },
  "es-ES": {
    "dashboard.label": "Panel",
    "settings.permissions": "Matriz de permisos",
    "settings.usage": "Uso",
    "audit.title": "Registros de auditoria",
  },
};

interface I18nContextValue {
  locale: Locale;
  enabledLocales: Locale[];
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  formatDate: (value: string | Date) => string;
  formatCurrency: (valuePence: number, currency?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  const setLocale = (nextLocale: Locale) => {
    if (!enabledLocales.includes(nextLocale)) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, nextLocale);
    setLocaleState(nextLocale);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    enabledLocales,
    setLocale,
    t: key => messages[locale][key] ?? messages[defaultLocale][key] ?? key,
    formatDate: valueToFormat => new Intl.DateTimeFormat(locale).format(new Date(valueToFormat)),
    formatCurrency: (valuePence, currency = "GBP") =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(valuePence / 100),
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }

  return context;
}

export function readStoredLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;

  return stored && enabledLocales.includes(stored) ? stored : defaultLocale;
}
