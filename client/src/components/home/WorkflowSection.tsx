const workflowSteps = [
  {
    title: "Create the job",
    body: "Capture the customer, address, job notes and schedule once.",
  },
  {
    title: "Send the quote",
    body: "Build the quote from the same customer record and keep follow-up visible.",
  },
  {
    title: "Convert and send the invoice",
    body: "Turn accepted work into invoice admin in a few clicks when the job is ready to bill.",
  },
  {
    title: "Track payment and admin status",
    body: "See what is drafted, sent, paid or still needs chasing before it disappears into a spreadsheet.",
  },
];

export default function WorkflowSection() {
  return (
    <section id="how-it-works" className="bg-slate-100 px-5 py-16 text-slate-950 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">How it works</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              From job to invoice without losing the admin trail.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              TradeLike helps owners and office teams save 2-6 admin hours a week by keeping jobs, quotes, invoices and follow-up in one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {workflowSteps.map((step, index) => (
              <div key={step.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-blue-700">Step {index + 1}</p>
                <h3 className="mt-2 text-lg font-bold text-slate-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
