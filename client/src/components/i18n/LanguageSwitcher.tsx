import { Languages } from "lucide-react";

import { useI18n } from "../../i18n";
import type { Locale } from "../../i18n";

const localeLabels: Record<Locale, string> = {
  "en-GB": "English",
  "fr-FR": "Francais",
  "es-ES": "Espanol",
};

export function LanguageSwitcher() {
  const { locale, enabledLocales, setLocale } = useI18n();

  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
      <Languages aria-hidden="true" className="h-4 w-4 text-slate-500" />
      <span className="sr-only">Language</span>
      <select
        className="bg-transparent font-semibold outline-none"
        value={locale}
        onChange={event => setLocale(event.target.value as Locale)}
      >
        {enabledLocales.map(item => (
          <option key={item} value={item}>
            {localeLabels[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
