export default function PlanLimitsPanel() {
  return <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Plan limits</h2><p className="mt-1 text-sm text-slate-600">Staff count, teams, scheduling, reports, support and API access belong in Billing settings.</p><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Card title="Solo" body="1 user · basic jobs · email support" /><Card title="Team" body="2-10 users · staff calendar · priority support" /><Card title="Business" body="11-25 users · teams and reporting · dedicated support" /><Card title="Enterprise" body="Unlimited users · custom reporting · dedicated support" /></div></section>;
}

function Card({ title, body }: { title: string; body: string }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="font-bold text-slate-900">{title}</p><p className="mt-2 text-sm text-slate-600">{body}</p></div>;
}
