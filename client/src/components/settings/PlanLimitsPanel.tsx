import Currency from "../ui/Currency";

export default function PlanLimitsPanel() {
  return <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Plan gates</h2><p className="mt-1 text-sm text-slate-600">Plan limits, staff counts, teams, scheduling, reports, support and API access live in Billing settings.</p><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Card title="Solo" pricePence={3500} body="1 included user. Unlimited jobs. Basic scheduling. Email support." /><Card title="Team" pricePence={7500} body="10 included users. Staff calendar. Teams included. Priority support." /><Card title="Business" pricePence={15000} body="25 included users. Team scheduling. Reporting. Dedicated support." /><Card title="Enterprise" pricePence={null} body="Unlimited users. Custom reporting. API access. Dedicated support." /></div></section>;
}

function Card({ title, pricePence, body }: { title: string; pricePence: number | null; body: string }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="font-bold text-slate-900">{title}</p><p className="mt-1 text-sm font-semibold text-blue-700"><Currency valuePence={pricePence} currency="GBP" />{pricePence != null ? "/month" : ""}</p><p className="mt-2 text-sm text-slate-600">{body}</p></div>;
}
