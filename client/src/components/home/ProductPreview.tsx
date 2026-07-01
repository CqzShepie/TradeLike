const schedule = [
  { time: "09:00", job: "Heating repair", customer: "A. Morgan", status: "Assigned" },
  { time: "11:30", job: "Bathroom leak", customer: "Patel & Co", status: "En route" },
  { time: "14:45", job: "Annual service", customer: "J. Clarke", status: "Scheduled" },
];

const quotePipeline = [
  { label: "Draft", count: 3, tone: "bg-slate-500" },
  { label: "Sent", count: 6, tone: "bg-blue-500" },
  { label: "Accepted", count: 4, tone: "bg-emerald-500" },
  { label: "Needs chase", count: 2, tone: "bg-amber-400" },
];

const engineers = [
  { name: "Dan", jobs: 4, load: 80 },
  { name: "Amira", jobs: 3, load: 60 },
  { name: "Lewis", jobs: 2, load: 40 },
];

export default function ProductPreview() {
  return (
    <section className="bg-slate-100 px-5 py-16 text-slate-950 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Product preview</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
            See jobs, quotes and engineer workload in one calm dashboard.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Demo data below shows the kind of everyday information a trade team needs at a glance.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Example dashboard</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-950">Today at a glance</h3>
            </div>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Preview data
            </span>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <h4 className="font-bold text-slate-950">Today's schedule</h4>
                <p className="text-xs font-semibold text-slate-500">3 of 12 shown</p>
              </div>
              <div className="mt-4 space-y-3">
                {schedule.map(item => (
                  <div key={`${item.time}-${item.job}`} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[72px_1fr_110px] sm:items-center">
                    <p className="text-sm font-bold text-blue-700">{item.time}</p>
                    <div>
                      <p className="font-semibold text-slate-950">{item.job}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.customer}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-center text-xs font-semibold text-slate-700">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-5">
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="font-bold text-slate-950">Quote pipeline</h4>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {quotePipeline.map(item => (
                    <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4">
                      <span className={`mb-3 block h-1.5 w-10 rounded-full ${item.tone}`} />
                      <p className="text-2xl font-bold text-slate-950">{item.count}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="font-bold text-slate-950">Engineer workload</h4>
                <div className="mt-4 space-y-4">
                  {engineers.map(engineer => (
                    <div key={engineer.name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-800">{engineer.name}</span>
                        <span className="text-slate-500">{engineer.jobs} jobs</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-200">
                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${engineer.load}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
