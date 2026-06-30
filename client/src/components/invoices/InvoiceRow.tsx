import { Link } from "react-router-dom";
import type { Invoice, InvoiceStatus } from "../../services/invoicesService";
import { invoiceEmailHref } from "../../utils/documentMessaging";

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const statuses: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Overdue", "Void"];

type Props = {
  invoice: Invoice;
  onStatusChange: (id: number, status: InvoiceStatus) => void;
  onDelete: (id: number) => void;
};

export default function InvoiceRow({ invoice, onStatusChange, onDelete }: Props) {
  return (
    <article className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_140px_140px_160px]">
      <div className="min-w-0">
        <p className="font-bold text-slate-900">{invoice.invoiceNumber} · {invoice.title}</p>
        <p className="mt-1 text-sm text-slate-600">{invoice.customerName} · Due {formatDate(invoice.dueDate)}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-blue-700">
          {invoice.jobId && <Link to={`/jobs/${invoice.jobId}`}>Job #{invoice.jobId}</Link>}
          {invoice.quoteId && <Link to={`/quotes/${invoice.quoteId}`}>Quote #{invoice.quoteId}</Link>}
        </div>
      </div>

      <select value={invoice.status} onChange={event => onStatusChange(invoice.id, event.target.value as InvoiceStatus)} className="h-fit rounded-lg border border-slate-300 px-3 py-2 text-sm">
        {statuses.map(status => <option key={status} value={status}>{status}</option>)}
      </select>

      <p className="h-fit rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-900">{money.format(invoice.total)}</p>

      <div className="flex flex-col gap-2">
        <a href={invoiceEmailHref(invoice)} className="h-fit rounded-lg border border-blue-200 px-3 py-2 text-center text-xs font-semibold text-blue-700 hover:bg-blue-50">Open email draft</a>
        <button type="button" onClick={() => onDelete(invoice.id)} className="h-fit rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-GB");
}
