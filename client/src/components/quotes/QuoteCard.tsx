import { Link } from "react-router-dom";
import Card from "../ui/Card";
import StatusBadge from "../ui/StatusBadge";
import type { Quote } from "../../types/quote";
import { formatMoney } from "../../utils/formatMoney";

type Props = {
  quote: Quote;
  onEdit: (quote: Quote) => void;
  onDelete: (quote: Quote) => void;
};

function QuoteCard({ quote, onEdit, onDelete }: Props) {
  return (
    <Card className="transition hover:border-blue-300 hover:shadow-md">
      <Link to={`/quotes/${quote.id}`} className="block">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Quote #{quote.id}
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">
              {quote.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {quote.customerName}
            </p>
          </div>

          <StatusBadge status={quote.status} />
        </div>

        {quote.description && (
          <p className="mb-4 line-clamp-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            {quote.description}
          </p>
        )}

        <div className="space-y-2 text-sm text-slate-600">
          <p>
            <span className="font-medium text-slate-800">Total:</span>{" "}
            {formatMoney(quote.total || quote.amount)}
          </p>
          <p>
            <span className="font-medium text-slate-800">VAT:</span>{" "}
            {formatMoney(quote.vatTotal || 0)}
          </p>
          <p>
            <span className="font-medium text-slate-800">Priced lines:</span>{" "}
            {quote.lineItems?.length ?? 0}
          </p>
        </div>

        <div className="mt-4 text-xs font-semibold text-blue-700">
          Open quote details →
        </div>
      </Link>

      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => onEdit(quote)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => onDelete(quote)}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </Card>
  );
}

export default QuoteCard;