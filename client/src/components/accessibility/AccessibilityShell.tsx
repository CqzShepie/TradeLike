import { useEffect, useState } from "react";

import { accessibilityService, applyAccessibilityPreferences } from "../../services/accessibilityService";
import type { AccessibilityPreferences } from "../../services/accessibilityService";

export default function AccessibilityShell({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => accessibilityService.getPreferences());

  useEffect(() => {
    applyAccessibilityPreferences(preferences);
    return accessibilityService.subscribe(next => {
      setPreferences(next);
      applyAccessibilityPreferences(next);
    });
  }, [preferences]);

  return (
    <>
      {preferences.showSkipLink && <a href="#main-content" className="tradelike-skip-link">Skip to main content</a>}
      <div id="accessibility-status" aria-live="polite" className="sr-only" />
      {children}
    </>
  );
}
