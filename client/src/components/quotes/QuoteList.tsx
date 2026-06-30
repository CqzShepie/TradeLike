import { Link } from "react-router-dom";
import type { Quote } from "../../types/quote";
import { quoteEmailHref } from "../../utils/documentMessaging";
import { formatMoney } from "../../utils/formatMoney";

interface QuoteListProps {
  quotes: Quote[];
  onEditQuote: (quote: Quote) => void;
  onDeleteQuote: (quote: Quote) => void;
}

export default function QuoteList({
  quotes,
  onEditQuote,
  onDeleteQuote,
}: QuoteListProps) {
  if (quotes.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No quotes found.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {quotes.map(quote => (
        <article
          key={quote.id}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
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

              <span className={getStatusClass(quote.status)}>
                {quote.status}
              </span>
            </div>

            {quote.description && (
              <p className="mb-4 line-clamp-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                {quote.description}
              </p>
            )}

            <div className="space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-800">Quote total:</span>{" "}
                {formatMoney(quote.total || quote.amount)}
              </p>
              <p>
                <span className="font-medium text-slate-800">
                  Subtotal before VAT:
                </span>{" "}
                {formatMoney(quote.subtotal || 0)}
              </p>
              <p>
                <span className="font-medium text-slate-800">VAT:</span>{" "}
                {formatMoney(quote.vatTotal || 0)}
              </p>
              <p>
                <span className="font-medium text-slate-800">Priced lines:</span>{" "}
                {quote.lineItems?.length ?? 0}
              </p>
              <p>
                <span className="font-medium text-slate-800">Created:</span>{" "}
                {new Date(quote.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>

            <div className="mt-4 text-xs font-semibold text-blue-700">
              Open quote details →
            </div>
          </Link>

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <a
              href={quoteEmailHref(quote)}
              className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
            >
              Email quote
            </a>

            <button
              type="button"
              onClick={() => onEditQuote(quote)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => onDeleteQuote(quote)}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function getStatusClass(status: Quote["status"]) {
  const base = "rounded-full px-2 py-1 text-xs font-semibold";

  switch (status) {
    case "Accepted":
      return `${base} bg-green-100 text-green-700`;
    case "Sent":
      return `${base} bg-blue-100 text-blue-700`;
    case "Rejected":
      return `${base} bg-red-100 text-red-700`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
}
