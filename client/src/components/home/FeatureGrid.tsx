const features = [
  {
    title: "Jobs & scheduling",
    body: "Plan today's work, keep future bookings tidy and see what needs attention.",
    accent: "bg-blue-500",
  },
  {
    title: "Quotes with VAT and discounts",
    body: "Build clear quotes with line items, VAT, discounts and totals your customers understand.",
    accent: "bg-emerald-500",
  },
  {
    title: "Convert accepted quotes into jobs",
    body: "Turn won work into scheduled jobs without retyping the same customer details.",
    accent: "bg-cyan-500",
  },
  {
    title: "Customer records",
    body: "Keep contact details, addresses, notes, job history and quote history close at hand.",
    accent: "bg-amber-400",
  },
  {
    title: "Engineer workload",
    body: "See who is busy, who is free and which jobs still need assigning.",
    accent: "bg-violet-500",
  },
  {
    title: "Dashboard overview",
    body: "Start the day with the numbers that matter: booked jobs, open quotes and urgent work.",
    accent: "bg-rose-500",
  },
];

export default function FeatureGrid() {
  return (
    <section id="features" className="bg-white px-5 py-16 text-slate-950 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Features</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Everything a growing trade team needs to keep work moving.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Built around the real rhythm of enquiries, quotes, scheduling and engineer updates.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map(feature => (
            <article key={feature.title} className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <span className={`block h-2 w-12 rounded-full ${feature.accent}`} />
              <h3 className="mt-5 text-xl font-bold text-slate-950">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
