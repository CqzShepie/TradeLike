const features = [
  {
    title: "Job scheduling",
    body: "Plan today, organise upcoming work and keep every booking easy to find.",
    accent: "bg-blue-500",
  },
  {
    title: "Customer management",
    body: "Keep contacts, addresses, notes and job history in one clean customer record.",
    accent: "bg-emerald-500",
  },
  {
    title: "Quotations",
    body: "Create clear quotes with line items, VAT and customer-ready totals.",
    accent: "bg-cyan-500",
  },
  {
    title: "Invoicing",
    body: "Create invoices from jobs or quotes and keep payment admin visible.",
    accent: "bg-amber-400",
  },
  {
    title: "Team scheduling",
    body: "Assign work, check workload and keep staff clear on what is booked next.",
    accent: "bg-violet-500",
  },
  {
    title: "Reports",
    body: "See basic job activity on Solo and unlock deeper reporting on higher plans.",
    accent: "bg-rose-500",
  },
  {
    title: "Inventory for Business+",
    body: "Track stock items, suppliers, quantities and low-stock alerts on Business and Enterprise.",
    accent: "bg-teal-500",
  },
  {
    title: "Mobile-friendly web app",
    body: "Use TradeLike from the office, van or site without installing a separate desktop tool.",
    accent: "bg-indigo-500",
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

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
