const workflowSteps = [
  "Customer added",
  "Quote sent",
  "Quote accepted",
  "Job scheduled",
  "Engineer assigned",
  "Job completed",
];

export default function WorkflowSection() {
  return (
    <section id="how-it-works" className="bg-slate-100 px-5 py-16 text-slate-950 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">How it works</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              From first enquiry to finished job, keep the whole workflow in one place.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              TradeLike follows the way trade businesses already work, then removes the double entry and lost context.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {workflowSteps.map((step, index) => (
              <div key={step} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-blue-700">Step {index + 1}</p>
                <h3 className="mt-2 text-lg font-bold text-slate-950">{step}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {index === 0
                    ? "Capture the job details once."
                    : index === workflowSteps.length - 1
                      ? "Close the loop with a clear job record."
                      : "Move the work forward without losing context."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
