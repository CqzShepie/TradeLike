import Currency from "../ui/Currency";

export type ExpenseSummaryItem = {
  category: string;
  totalPence: number;
};

const categoryOrder = ["Fuel", "Materials", "Mileage", "Other"];

export default function ExpenseSummaryChart({ items }: { items: ExpenseSummaryItem[] }) {
  const rows = categoryOrder.map(category => ({
    category,
    totalPence: items.find(item => item.category === category)?.totalPence ?? 0,
  }));
  const max = Math.max(...rows.map(row => row.totalPence), 1);

  return (
    <div className="space-y-4">
      {rows.map(row => (
        <div key={row.category} data-testid="expense-summary-row" className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-slate-800">{row.category}</span>
            <strong data-testid="expense-category-total" className="text-sm text-slate-950">
              <Currency valuePence={row.totalPence} currency="GBP" />
            </strong>
          </div>
          <div className="mt-3 h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-blue-600"
              style={{ width: `${Math.max(4, Math.round((row.totalPence / max) * 100))}%` }}
              aria-label={`${row.category} total`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
