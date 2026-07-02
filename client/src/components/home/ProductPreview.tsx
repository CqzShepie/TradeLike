const previewSections = [
  "Today's schedule",
  "Upcoming jobs",
  "Recent activity",
  "Quick actions",
  "Quotes needing action",
  "Invoices needing action",
];

const quickActions = ["New Job", "Add Customer", "Create Quote", "Open Calendar", "Send Invoice"];

export default function ProductPreview() {
  return (
    <section className="bg-slate-100 px-5 py-16 text-slate-950 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Product preview</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
            A dashboard that matches the real TradeLike workspace.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            The customer dashboard brings jobs, quote follow-up, invoice admin and common actions into one readable dark workspace.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl shadow-slate-300/60 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Customer dashboard</p>
              <h3 className="mt-1 text-2xl font-bold text-white">Trade business at a glance</h3>
            </div>
            <span className="rounded-full border border-blue-300/30 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-100">
              Dark workspace
            </span>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
              <h4 className="font-bold text-white">Live overview</h4>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Review today, upcoming work and activity without jumping between pages.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {previewSections.map(section => (
                  <div key={section} className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-sm font-bold text-white">{section}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">Shown when the workspace has matching real data.</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
              <h4 className="font-bold text-white">Quick actions</h4>
              <p className="mt-2 text-sm text-slate-300">Start the common admin tasks in a click.</p>
              <div className="mt-5 grid gap-3">
                {quickActions.map(action => (
                  <div key={action} className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-sm font-bold text-white">{action}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
