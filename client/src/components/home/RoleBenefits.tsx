const roles = [
  {
    title: "For owners",
    body: "Know what is booked, quoted and needs chasing before the day runs away from you.",
  },
  {
    title: "For office and admin staff",
    body: "Create jobs, manage customers and keep the schedule clean without bouncing between tools.",
  },
  {
    title: "For engineers",
    body: "Know where to go, what the job is and who the customer is before arriving on site.",
  },
];

export default function RoleBenefits() {
  return (
    <section className="bg-slate-950 px-5 py-16 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Team benefits</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Useful for everyone who touches the job.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {roles.map(role => (
            <article key={role.title} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-xl font-bold text-white">{role.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{role.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
