import Card from "../ui/Card";
import Button from "../ui/Button";
import StatusBadge from "../ui/StatusBadge";

import type { Quote } from "../../types/quote";

type Props = {
  quote: Quote;
  onEdit: (quote: Quote) => void;
  onDelete: (quote: Quote) => void;
};

function QuoteCard({ quote, onEdit, onDelete }: Props) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {quote.title}
          </h3>

          <p className="text-sm text-slate-500">
            {quote.customerName}
          </p>

          {quote.description && (
            <p className="mt-2 text-sm text-slate-600">
              {quote.description}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-lg font-bold">
            £{quote.amount.toFixed(2)}
          </p>

          <div className="mt-2">
            <StatusBadge status={quote.status} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <Button
          variant="secondary"
          onClick={() => onEdit(quote)}
        >
          Edit
        </Button>

        <Button
          variant="danger"
          onClick={() => onDelete(quote)}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}

export default QuoteCard;