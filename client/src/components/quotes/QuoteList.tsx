import Card from "../ui/Card";
import Button from "../ui/Button";

import type { Quote } from "../../types/quote";

type Props = {
  quotes: Quote[];
  onEditQuote: (quote: Quote) => void;
  onDeleteQuote: (quote: Quote) => void;
};

function QuoteList({
  quotes,
  onEditQuote,
  onDeleteQuote,
}: Props) {
  if (quotes.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center text-slate-500">
          No quotes found.
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Customer
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Quote
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Amount
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {quotes.map((quote) => (
              <tr
                key={quote.id}
                className="border-b last:border-0 hover:bg-slate-50"
              >
                <td className="px-6 py-4">
                  {quote.customerName}
                </td>

                <td className="px-6 py-4">
                  <div className="font-medium">
                    {quote.title}
                  </div>

                  {quote.description && (
                    <div className="text-sm text-slate-500">
                      {quote.description}
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 font-medium">
                  £{quote.amount.toFixed(2)}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold
                    ${
                      quote.status === "Accepted"
                        ? "bg-green-100 text-green-700"
                        : quote.status === "Rejected"
                        ? "bg-red-100 text-red-700"
                        : quote.status === "Sent"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {quote.status}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => onEditQuote(quote)}
                    >
                      Edit
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() => onDeleteQuote(quote)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default QuoteList;