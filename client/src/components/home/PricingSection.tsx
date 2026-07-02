const plans = [
  {
    name: "Solo",
    price: "£40/month",
    cta: "Start Solo",
    features: ["1 user", "Email support", "Basic reporting"],
  },
  {
    name: "Team",
    price: "£99/month",
    cta: "Start Team",
    features: ["2-10 users", "Priority support", "Advanced reporting"],
  },
  {
    name: "Business",
    price: "£199/month",
    cta: "Start Business",
    features: ["11-25 users", "Dedicated support", "Advanced + Custom reporting", "API access"],
  },
  {
    name: "Enterprise",
    price: "Contact Sales",
    cta: "sales@tradelike.co.uk",
    features: ["Unlimited users", "Dedicated support", "Advanced + Custom reporting", "API access"],
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-white px-5 py-16 text-slate-950 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Choose the plan that matches your trade business.</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Start simple, then add team tools, reporting, inventory and API access as your business grows.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-4">
          {plans.map(plan => (
            <article key={plan.name} className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-xl font-bold text-slate-950">{plan.name}</h3>
              <p className="mt-4 text-3xl font-bold text-blue-700">{plan.price}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm leading-6 text-slate-600">
                {plan.features.map(feature => (
                  <li key={feature} className="font-medium">{feature}</li>
                ))}
              </ul>
              {plan.name === "Enterprise" ? (
                <a href="mailto:sales@tradelike.co.uk" className="mt-6 inline-flex justify-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">
                  {plan.cta}
                </a>
              ) : (
                <a href="/signup" className="mt-6 inline-flex justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500">
                  {plan.cta}
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
