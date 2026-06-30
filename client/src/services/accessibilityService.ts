export type AccessibilityTheme = "system" | "light" | "dark";
export type AccessibilityTextSize = "normal" | "large" | "extra-large";
export type AccessibilitySpacing = "compact" | "comfortable" | "roomy";
export type AccessibilityLineSpacing = "normal" | "comfortable" | "wide";
export type AccessibilityToastPosition = "top" | "bottom";

export type AccessibilityPreferences = {
  theme: AccessibilityTheme;
  highContrast: boolean;
  textSize: AccessibilityTextSize;
  spacing: AccessibilitySpacing;
  reduceMotion: boolean;
  colourBlindFriendly: boolean;
  underlineLinks: boolean;
  largeControls: boolean;
  keyboardFocus: boolean;
  showSkipLink: boolean;
  plainLanguage: boolean;
  showExtraHelp: boolean;
  dyslexiaFont: boolean;
  lineSpacing: AccessibilityLineSpacing;
  showRequiredLabels: boolean;
  strongerValidation: boolean;
  preventAccidentalFormLoss: boolean;
  errorSummary: boolean;
  calendarTextLabels: boolean;
  hideCapacityWarnings: boolean;
  simplifyCalendar: boolean;
  largeCalendarCards: boolean;
  autoHideMessages: boolean;
  messageDurationSeconds: number;
  soundAlerts: boolean;
  toastPosition: AccessibilityToastPosition;
};

const storageKey = "tradelike_accessibility_preferences";
const eventName = "tradelike-accessibility-updated";

export const defaultAccessibilityPreferences: AccessibilityPreferences = {
  theme: "system",
  highContrast: false,
  textSize: "normal",
  spacing: "compact",
  reduceMotion: false,
  colourBlindFriendly: false,
  underlineLinks: false,
  largeControls: false,
  keyboardFocus: true,
  showSkipLink: true,
  plainLanguage: false,
  showExtraHelp: true,
  dyslexiaFont: false,
  lineSpacing: "normal",
  showRequiredLabels: true,
  strongerValidation: true,
  preventAccidentalFormLoss: true,
  errorSummary: true,
  calendarTextLabels: true,
  hideCapacityWarnings: false,
  simplifyCalendar: false,
  largeCalendarCards: false,
  autoHideMessages: false,
  messageDurationSeconds: 8,
  soundAlerts: false,
  toastPosition: "top",
};

export const accessibilityService = {
  getPreferences(): AccessibilityPreferences {
    return normalisePreferences(readPreferences());
  },

  updatePreferences(patch: Partial<AccessibilityPreferences>) {
    const next = normalisePreferences({ ...this.getPreferences(), ...patch });
    localStorage.setItem(storageKey, JSON.stringify(next));
    applyAccessibilityPreferences(next);
    window.dispatchEvent(new CustomEvent(eventName, { detail: next }));
    return next;
  },

  resetPreferences() {
    localStorage.setItem(storageKey, JSON.stringify(defaultAccessibilityPreferences));
    applyAccessibilityPreferences(defaultAccessibilityPreferences);
    window.dispatchEvent(new CustomEvent(eventName, { detail: defaultAccessibilityPreferences }));
    return defaultAccessibilityPreferences;
  },

  subscribe(callback: (preferences: AccessibilityPreferences) => void) {
    const handler = () => callback(this.getPreferences());
    window.addEventListener(eventName, handler);
    window.addEventListener("storage", handler);
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener?.("change", handler);

    return () => {
      window.removeEventListener(eventName, handler);
      window.removeEventListener("storage", handler);
      media?.removeEventListener?.("change", handler);
    };
  },
};

export function applyAccessibilityPreferences(preferences: AccessibilityPreferences = accessibilityService.getPreferences()) {
  const root = document.documentElement;
  const resolvedTheme = resolveTheme(preferences.theme);

  root.dataset.accessibilityTheme = resolvedTheme;
  root.dataset.accessibilityTextSize = preferences.textSize;
  root.dataset.accessibilitySpacing = preferences.spacing;
  root.dataset.accessibilityLineSpacing = preferences.lineSpacing;
  root.dataset.accessibilityHighContrast = String(preferences.highContrast);
  root.dataset.accessibilityReduceMotion = String(preferences.reduceMotion);
  root.dataset.accessibilityColourBlind = String(preferences.colourBlindFriendly);
  root.dataset.accessibilityUnderlineLinks = String(preferences.underlineLinks);
  root.dataset.accessibilityLargeControls = String(preferences.largeControls);
  root.dataset.accessibilityKeyboardFocus = String(preferences.keyboardFocus);
  root.dataset.accessibilityPlainLanguage = String(preferences.plainLanguage);
  root.dataset.accessibilityExtraHelp = String(preferences.showExtraHelp);
  root.dataset.accessibilityDyslexiaFont = String(preferences.dyslexiaFont);
  root.dataset.accessibilityCalendarLabels = String(preferences.calendarTextLabels);
  root.dataset.accessibilitySimplifyCalendar = String(preferences.simplifyCalendar);
  root.dataset.accessibilityLargeCalendarCards = String(preferences.largeCalendarCards);
  root.dataset.accessibilityToastPosition = preferences.toastPosition;
}

function readPreferences() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Partial<AccessibilityPreferences>;
  } catch {
    return {} as Partial<AccessibilityPreferences>;
  }
}

function normalisePreferences(input: Partial<AccessibilityPreferences>): AccessibilityPreferences {
  const next = { ...defaultAccessibilityPreferences, ...input };
  next.messageDurationSeconds = Math.max(2, Math.min(30, Number(next.messageDurationSeconds || defaultAccessibilityPreferences.messageDurationSeconds)));
  return next;
}

function resolveTheme(theme: AccessibilityTheme) {
  if (theme === "system") {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return theme;
}
