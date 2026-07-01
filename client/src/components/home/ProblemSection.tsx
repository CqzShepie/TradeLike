const painPoints = [
  "Missed quote follow-ups",
  "Customer details scattered across phones",
  "Engineers unclear on where to go next",
  "No clean view of today's workload",
  "Job history hard to find",
  "Admin eating into evenings",
];

export default function ProblemSection() {
  return (
    <section className="border-y border-slate-800 bg-slate-950 px-5 py-16 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">The usual trade admin problem</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Still running jobs from texts, paper notes and spreadsheets?
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-300">
            TradeLike is built to bring the moving parts of a busy trade business into one place, so nothing important gets buried.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map(point => (
            <div key={point} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <span className="block h-1.5 w-10 rounded-full bg-amber-300" />
              <h3 className="mt-4 text-lg font-bold text-white">{point}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Replace scattered admin with a shared view your team can trust.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
