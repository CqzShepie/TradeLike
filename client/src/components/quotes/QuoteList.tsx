import type { Quote } from "../../types/quote";
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                        <th className="px-4 py-3">Quote</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                    {quotes.map(quote => (
                        <tr key={quote.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                                <div className="font-semibold text-slate-900">
                                    {quote.title}
                                </div>

                                {quote.description && (
                                    <div className="mt-1 text-xs text-slate-500">
                                        {quote.description}
                                    </div>
                                )}
                            </td>

                            <td className="px-4 py-3 text-slate-700">
                                {quote.customerName}
                            </td>

                            <td className="px-4 py-3 font-semibold text-slate-900">
                                {formatMoney(quote.amount)}
                            </td>

                            <td className="px-4 py-3">
                                <span className={getStatusClass(quote.status)}>
                                    {quote.status}
                                </span>
                            </td>

                            <td className="px-4 py-3 text-slate-500">
                                {new Date(quote.createdAt).toLocaleDateString("en-GB")}
                            </td>

                            <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onEditQuote(quote)}
                                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onDeleteQuote(quote)}
                                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
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