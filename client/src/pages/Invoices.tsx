import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, FileText, Plus, ReceiptText } from "lucide-react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  ProductPage,
  ProductPageHeader,
  ProductPanel,
  ProductStat,
  SecondaryButton,
  SelectInput,
  StatusBadge,
  TextInput,
} from "../components/ui";
import { invoicesService } from "../services/invoicesService";
import type { Invoice, InvoiceStatus } from "../services/invoicesService";
import { paymentsService } from "../services/paymentsService";
import { jobsService } from "../services/jobsService";
import { quotesService } from "../services/quotesService";
import { isApiError } from "../services/apiClient";
import type { Job } from "../types/job";
import type { Quote } from "../types/quote";
import AccessDenied from "./AccessDenied";
import UpgradeRequired from "./UpgradeRequired";

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const statuses: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Overdue", "Void"];

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "All">("All");
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [jobRows, quoteRows] = await Promise.all([jobsService.getAll(), quotesService.getAll()]);
      setJobs(jobRows);
      setQuotes(quoteRows);
      setInvoices(invoicesService.getAll());
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Invoices could not be loaded."));
      setInvoices(invoicesService.getAll());
    } finally {
      setLoading(false);
    }
  }

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter(invoice => {
      const matchesStatus = statusFilter === "All" || invoice.status === statusFilter;
      const matchesSearch =
        query === "" ||
        [
          invoice.invoiceNumber,
          invoice.customerName,
          invoice.title,
          invoice.status,
          invoice.quoteId ? `quote ${invoice.quoteId}` : "",
          invoice.jobId ? `job ${invoice.jobId}` : "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [invoices, search, statusFilter]);

  const totals = useMemo(
    () => ({
      draft: invoices.filter(invoice => invoice.status === "Draft").length,
      sent: invoices.filter(invoice => invoice.status === "Sent").length,
      paid: invoices.filter(invoice => invoice.status === "Paid").length,
      overdue: invoices.filter(invoice => invoice.status === "Overdue").length,
      outstanding: invoices
        .filter(invoice => invoice.status !== "Paid" && invoice.status !== "Void")
        .reduce((sum, invoice) => sum + invoice.total, 0),
    }),
    [invoices]
  );

  function refresh() {
    setInvoices(invoicesService.getAll());
  }

  function createFromQuote() {
    const quote = quotes.find(item => item.id === Number(selectedQuoteId));

    if (!quote) {
      return;
    }

    const invoice = invoicesService.createFromQuote(quote);
    refresh();
    setSelectedQuoteId("");
    setMessage(`Created ${invoice.invoiceNumber} from Quote #${quote.id}.`);
  }

  function createFromJob() {
    const job = jobs.find(item => item.id === Number(selectedJobId));

    if (!job) {
      return;
    }

    const invoice = invoicesService.createFromJob(job);
    refresh();
    setSelectedJobId("");
    setMessage(`Created ${invoice.invoiceNumber} from Job #${job.id}.`);
  }

  function updateStatus(id: number, status: InvoiceStatus) {
    setInvoices(invoicesService.updateStatus(id, status));
  }

  function deleteInvoice(id: number) {
    if (!confirm("Delete this invoice?")) {
      return;
    }

    setInvoices(invoicesService.delete(id));
  }

  async function payNow(invoice: Invoice) {
    try {
      const result = await paymentsService.checkout(invoice.id, "stripe");
      window.location.href = result.checkoutUrl;
    } catch {
      setMessage("Could not start checkout for this invoice.");
    }
  }

  if (isApiError(error) && error.status === 403) {
    return <AccessDenied />;
  }

  if (isApiError(error) && error.status === 402) {
    return <UpgradeRequired />;
  }

  return (
    <ProductPage>
      <ProductPageHeader
        eyebrow="Billing workspace"
        title="Invoices"
        description="Create invoices from quotes or jobs, track status, and keep customer billing linked to operational work."
        actions={<PrimaryButton type="button" onClick={refresh}>Refresh invoices</PrimaryButton>}
      />

      {message && (
        <ProductPanel className="border-emerald-400/30 bg-emerald-500/10">
          <p className="text-sm font-semibold text-emerald-100">{message}</p>
        </ProductPanel>
      )}

      {loading && <LoadingState title="Loading invoices" description="Fetching jobs, quotes, and local invoice records." />}

      {!loading && error && (
        <ErrorState
          title="Invoice source data could not be loaded"
          description={error.message}
          action={
            <SecondaryButton type="button" onClick={() => void load()} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
              Try again
            </SecondaryButton>
          }
        />
      )}

      {!loading && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ProductStat label="Draft" value={totals.draft} helper="being prepared" icon={<FileText className="h-5 w-5" />} />
            <ProductStat label="Sent" value={totals.sent} helper="awaiting payment" icon={<ReceiptText className="h-5 w-5" />} />
            <ProductStat label="Paid" value={totals.paid} helper="settled invoices" icon={<CreditCard className="h-5 w-5" />} />
            <ProductStat label="Overdue" value={totals.overdue} helper="needs attention" icon={<ReceiptText className="h-5 w-5" />} />
            <ProductStat label="Outstanding value" value={money.format(totals.outstanding)} helper="unpaid total" icon={<CreditCard className="h-5 w-5" />} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <section className="space-y-6">
              <CreatePanel
                title="Create from quote"
                selectValue={selectedQuoteId}
                onSelect={setSelectedQuoteId}
                onCreate={createFromQuote}
                disabled={!selectedQuoteId}
                options={quotes.map(quote => ({
                  id: quote.id,
                  label: `#${quote.id} ${quote.customerName} - ${quote.title} - ${money.format(Number(quote.total ?? 0))}`,
                }))}
              />

              <CreatePanel
                title="Create from job"
                selectValue={selectedJobId}
                onSelect={setSelectedJobId}
                onCreate={createFromJob}
                disabled={!selectedJobId}
                options={jobs.map(job => ({
                  id: job.id,
                  label: `#${job.id} ${job.customer} - ${job.jobTitle}`,
                }))}
              />
            </section>

            <ProductPanel>
              <div className="flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">Receivables</p>
                  <h2 className="mt-2 text-xl font-bold text-white">Invoice list</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Local invoice records are ready to be connected to fuller invoice backend storage.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_170px] lg:w-[520px]">
                  <TextInput
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search invoice, customer, job, quote..."
                    className="border-white/10 bg-slate-950/60 text-white placeholder:text-slate-500"
                  />
                  <SelectInput value={statusFilter} onChange={event => setStatusFilter(event.target.value as InvoiceStatus | "All")} className="border-white/10 bg-slate-950/60 text-white">
                    <option value="All">All statuses</option>
                    {statuses.map(status => <option key={status} value={status}>{status}</option>)}
                  </SelectInput>
                </div>
              </div>

              <div className="mt-6">
                {filteredInvoices.length === 0 ? (
                  <EmptyState
                    title="No invoices yet"
                    description="Create an invoice from an accepted quote or completed job when you are ready to bill."
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredInvoices.map(invoice => (
                      <InvoiceRow
                        key={invoice.id}
                        invoice={invoice}
                        onStatusChange={status => updateStatus(invoice.id, status)}
                        onPayNow={() => void payNow(invoice)}
                        onDelete={() => deleteInvoice(invoice.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ProductPanel>
          </div>
        </>
      )}
    </ProductPage>
  );
}

function CreatePanel({
  title,
  selectValue,
  onSelect,
  onCreate,
  disabled,
  options,
}: {
  title: string;
  selectValue: string;
  onSelect: (value: string) => void;
  onCreate: () => void;
  disabled: boolean;
  options: Array<{ id: number; label: string }>;
}) {
  return (
    <ProductPanel>
      <div className="flex items-center gap-2">
        <Plus className="h-5 w-5 text-blue-300" />
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="mt-4 grid gap-3">
        <SelectInput value={selectValue} onChange={event => onSelect(event.target.value)} className="border-white/10 bg-slate-950/60 text-white">
          <option value="">Choose source</option>
          {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </SelectInput>
        <PrimaryButton type="button" onClick={onCreate} disabled={disabled} fullWidth>
          Create invoice
        </PrimaryButton>
      </div>
    </ProductPanel>
  );
}

function InvoiceRow({
  invoice,
  onStatusChange,
  onPayNow,
  onDelete,
}: {
  invoice: Invoice;
  onStatusChange: (status: InvoiceStatus) => void;
  onPayNow: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_150px_130px_180px] lg:items-start">
        <div className="min-w-0">
          <p className="font-bold text-white">{invoice.invoiceNumber} - {invoice.title}</p>
          <p className="mt-1 text-sm text-slate-400">{invoice.customerName} - Due {formatDate(invoice.dueDate)}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-blue-300">
            {invoice.jobId && <Link to={`/jobs/${invoice.jobId}`}>Job #{invoice.jobId}</Link>}
            {invoice.quoteId && <Link to={`/quotes/${invoice.quoteId}`}>Quote #{invoice.quoteId}</Link>}
          </div>
        </div>
        <SelectInput value={invoice.status} onChange={event => onStatusChange(event.target.value as InvoiceStatus)} className="border-white/10 bg-slate-900 text-white">
          {statuses.map(status => <option key={status} value={status}>{status}</option>)}
        </SelectInput>
        <div>
          <StatusBadge status={invoice.status} />
          <p className="mt-2 text-lg font-bold text-white">{money.format(invoice.total)}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button type="button" onClick={onPayNow} className="rounded-lg border border-blue-400/30 px-3 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-500/10">Pay Now</button>
          <button type="button" onClick={onDelete} className="rounded-lg border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10">Delete</button>
        </div>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString("en-GB");
}
