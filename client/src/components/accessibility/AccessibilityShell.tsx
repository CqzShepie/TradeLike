import { useEffect, useState } from "react";
import { accessibilityService, applyAccessibilityPreferences } from "../../services/accessibilityService";
import type { AccessibilityPreferences } from "../../services/accessibilityService";

export default function AccessibilityShell({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => accessibilityService.getPreferences());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyAccessibilityPreferences(preferences);
    return accessibilityService.subscribe(next => {
      setPreferences(next);
      applyAccessibilityPreferences(next);
    });
  }, [preferences]);

  function update(patch: Partial<AccessibilityPreferences>) {
    setPreferences(accessibilityService.updatePreferences(patch));
  }

  return (
    <>
      {preferences.showSkipLink && <a href="#main-content" className="tradelike-skip-link">Skip to main content</a>}
      <div id="accessibility-status" aria-live="polite" className="sr-only" />
      {children}
      <button type="button" onClick={() => setOpen(value => !value)} className="fixed bottom-4 right-4 z-50 rounded-full bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-xl">Accessibility</button>
      {open && <aside className="fixed bottom-20 right-4 z-50 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"><button type="button" onClick={() => setOpen(false)} className="float-right rounded px-2 text-xl leading-none text-slate-500 hover:bg-slate-100">×</button><p className="text-sm font-bold text-slate-900">Quick settings</p><div className="mt-4 grid gap-2"><Toggle label="High contrast" value={preferences.highContrast} onChange={value => update({ highContrast: value })} /><Toggle label="Large text" value={preferences.textSize !== "normal"} onChange={value => update({ textSize: value ? "large" : "normal" })} /><Toggle label="Bigger buttons" value={preferences.largeControls} onChange={value => update({ largeControls: value })} /><Toggle label="Reduce motion" value={preferences.reduceMotion} onChange={value => update({ reduceMotion: value })} /></div></aside>}
    </>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span className="font-semibold text-slate-700">{label}</span><input type="checkbox" checked={value} onChange={event => onChange(event.target.checked)} className="h-5 w-5" /></label>;
}
