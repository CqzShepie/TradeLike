import { pricingPlans } from "../../config/pricing";
import Currency from "../ui/Currency";

export default function PlanLimitsPanel() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Plan gates</h2>
      <p className="mt-1 text-sm text-slate-600">Plan limits, staff counts, teams, scheduling, reports, support and API access live in Billing settings.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {pricingPlans.map(plan => (
          <Card
            key={plan.name}
            title={plan.name}
            pricePence={plan.pricePence}
            perUserDisplay={plan.perUserDisplay}
            body={`${plan.userLimitLabel}. ${plan.features.slice(1).join(". ")}.`}
          />
        ))}
      </div>
    </section>
  );
}

function Card({ title, pricePence, perUserDisplay, body }: { title: string; pricePence: number | null; perUserDisplay: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-sm font-semibold text-blue-700">
        {pricePence == null ? "Contact Sales" : <><Currency valuePence={pricePence} currency="GBP" />/month</>}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{perUserDisplay}</p>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}
