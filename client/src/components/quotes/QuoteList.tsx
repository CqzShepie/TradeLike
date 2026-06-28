import type { Quote } from "../../types/quote";
import QuoteCard from "./QuoteCard";

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
      <p className="text-center text-slate-500">
        No quotes found.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {quotes.map((quote) => (
        <QuoteCard
          key={quote.id}
          quote={quote}
          onEdit={onEditQuote}
          onDelete={onDeleteQuote}
        />
      ))}
    </div>
  );
}

export default QuoteList;