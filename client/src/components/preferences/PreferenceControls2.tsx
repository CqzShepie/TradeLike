import { useState } from "react";

export default function PreferenceControls2() {
  const [large, setLarge] = useState(false);

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Quick accessibility controls</h2>
      <label className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
        <span className="font-semibold text-slate-900">Larger text preview</span>
        <input type="checkbox" checked={large} onChange={event => setLarge(event.target.checked)} />
      </label>
    </div>
  );
}
