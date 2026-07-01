import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Mail, Plus, PoundSterling } from "lucide-react";

import NewQuoteForm from "../components/quotes/NewQuoteForm";
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
  SelectMenu,
  StatusBadge,
} from "../components/ui";
import type { Quote, QuoteStatus } from "../types/quote";
import { isApiError } from "../services/apiClient";
import { useQuotes } from "../hooks/useQuotes";
import { quoteEmailHref } from "../utils/documentMessaging";
import { formatMoney } from "../utils/formatMoney";
import AccessDenied from "./AccessDenied";
import UpgradeRequired from "./UpgradeRequired";

type QuoteStatusFilter = QuoteStatus | "All";

function Quotes() {
  const {
    quotes,
    loading,
    error,
    addQuote,
    updateQuote,
    startEdit,
    editingQuote,
    cancelEdit,
    reloadQuotes,
  } = useQuotes();

  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>("All");
  const [showForm, setShowForm] = useState(false);

  const filteredQuotes = useMemo(
    () => quotes.filter(quote => statusFilter === "All" || quote.status === statusFilter),
    [quotes, statusFilter]
  );

  const totalValue = quotes.reduce(
    (sum, quote) => sum + Number(quote.total || quote.amount || 0),
    0
  );

  const stats = [
    { label: "Draft", value: countStatus(quotes, "Draft"), helper: "not yet sent" },
    { label: "Sent", value: countStatus(quotes, "Sent"), helper: "with customers" },
    { label: "Accepted", value: countStatus(quotes, "Accepted"), helper: "ready for work" },
    { label: "Rejected", value: countStatus(quotes, "Rejected"), helper: "lost or declined" },
    { label: "Total value", value: formatMoney(totalValue), helper: "quoted pipeline" },
  ];

  if (isApiError(error) && error.status === 403) {
    return <AccessDenied />;
  }

  if (isApiError(error) && error.status === 402) {
    return <UpgradeRequired />;
  }

  return (
    <ProductPage>
      <ProductPageHeader
        eyebrow="Quote pipeline"
        title="Quotes"
        description="Create, price, send, and convert customer quotes while keeping totals and status easy to scan."
        actions={
          <PrimaryButton
            type="button"
            onClick={() => {
              if (editingQuote) {
                cancelEdit();
              }

              setShowForm(previous => !previous);
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {showForm || editingQuote ? "Close form" : "New quote"}
            </span>
          </PrimaryButton>
        }
      />

      {loading && <LoadingState title="Loading quotes" description="Fetching quote values, statuses, and line item summaries." />}

      {!loading && error && (
        <ErrorState
          title="Unable to load quotes"
          description={error.message}
          action={
            <SecondaryButton type="button" onClick={reloadQuotes} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
              Retry
            </SecondaryButton>
          }
        />
      )}

      {!loading && !error && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {stats.map(stat => (
              <ProductStat
                key={stat.label}
                label={stat.label}
                value={stat.value}
                helper={stat.helper}
                icon={stat.label === "Total value" ? <PoundSterling className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              />
            ))}
          </section>

          {(showForm || editingQuote) && (
            <ProductPanel>
              <NewQuoteForm
                onAddQuote={async quote => {
                  await addQuote(quote);
                  setShowForm(false);
                }}
                onUpdateQuote={async quote => {
                  await updateQuote(quote);
                  setShowForm(false);
                }}
                editingQuote={editingQuote}
                onCancelEdit={() => {
                  cancelEdit();
                  setShowForm(false);
                }}
              />
            </ProductPanel>
          )}

          <ProductPanel>
            <div className="flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">Commercial view</p>
                <h2 className="mt-2 text-xl font-bold text-white">Quote management</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Open a quote to review line items, VAT, discounts and conversion options.
                </p>
              </div>
              <div className="w-full max-w-xs">
                <SelectMenu
                  ariaLabel="Quote status filter"
                  value={statusFilter}
                  onChange={value => setStatusFilter(value as QuoteStatusFilter)}
                  options={[
                    { value: "All", label: "All statuses" },
                    { value: "Draft", label: "Draft" },
                    { value: "Sent", label: "Sent" },
                    { value: "Accepted", label: "Accepted" },
                    { value: "Rejected", label: "Rejected" },
                  ]}
                />
              </div>
            </div>

            <div className="mt-6">
              {filteredQuotes.length === 0 ? (
                <EmptyState
                  title="No quotes found"
                  description={quotes.length === 0 ? "Create your first quote to start tracking potential work." : "Try a different status filter."}
                  action={<PrimaryButton type="button" onClick={() => setShowForm(true)}>Create quote</PrimaryButton>}
                />
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-2xl border border-white/10 lg:block">
                    <table className="min-w-full divide-y divide-white/10 text-sm">
                      <thead className="bg-white/[0.03] text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Quote</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Value</th>
                          <th className="px-4 py-3">Created</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {filteredQuotes.map(quote => (
                          <QuoteRow
                            key={quote.id}
                            quote={quote}
                            onEdit={() => {
                              startEdit(quote);
                              setShowForm(true);
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-4 lg:hidden">
                    {filteredQuotes.map(quote => (
                      <QuoteMobileCard
                        key={quote.id}
                        quote={quote}
                        onEdit={() => {
                          startEdit(quote);
                          setShowForm(true);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </ProductPanel>
        </>
      )}

    </ProductPage>
  );
}

function QuoteRow({
  quote,
  onEdit,
}: {
  quote: Quote;
  onEdit: () => void;
}) {
  return (
    <tr className="align-top text-slate-200 transition hover:bg-white/[0.03]">
      <td className="px-4 py-4">
        <Link to={`/quotes/${quote.id}`} className="font-semibold text-white hover:text-blue-200">#{quote.id} {quote.title}</Link>
        {quote.description && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{quote.description}</p>}
      </td>
      <td className="px-4 py-4">{quote.customerName}</td>
      <td className="px-4 py-4"><StatusBadge status={quote.status} /></td>
      <td className="px-4 py-4 font-semibold text-white">{formatMoney(quote.total || quote.amount || 0)}</td>
      <td className="px-4 py-4">{formatDate(quote.createdAt)}</td>
      <td className="px-4 py-4">
        <div className="flex justify-end gap-2">
          <Link to={`/quotes/${quote.id}`} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/10">View</Link>
          <button type="button" onClick={() => emailQuote(quote)} className="rounded-lg border border-blue-400/30 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-500/10">Send</button>
          <button type="button" onClick={onEdit} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/10">Edit</button>
          {quote.status === "Accepted" && (
            <Link to={`/quotes/${quote.id}`} className="rounded-lg border border-green-400/30 px-3 py-1.5 text-xs font-semibold text-green-200 hover:bg-green-500/10">Convert</Link>
          )}
        </div>
      </td>
    </tr>
  );
}

function QuoteMobileCard({
  quote,
  onEdit,
}: {
  quote: Quote;
  onEdit: () => void;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Quote #{quote.id}</p>
          <Link to={`/quotes/${quote.id}`} className="mt-1 block text-lg font-bold text-white hover:text-blue-200">{quote.title}</Link>
          <p className="mt-1 text-sm text-slate-400">{quote.customerName}</p>
        </div>
        <StatusBadge status={quote.status} />
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
        <Info label="Value" value={formatMoney(quote.total || quote.amount || 0)} />
        <Info label="Lines" value={String(quote.lineItems?.length ?? 0)} />
        <Info label="Created" value={formatDate(quote.createdAt)} />
        <Info label="VAT" value={formatMoney(quote.vatTotal || 0)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => emailQuote(quote)} className="rounded-lg border border-blue-400/30 px-3 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-500/10">
          <span className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Send</span>
        </button>
        <button type="button" onClick={onEdit} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10">Edit</button>
        {quote.status === "Accepted" && (
          <Link to={`/quotes/${quote.id}`} className="rounded-lg border border-green-400/30 px-3 py-2 text-xs font-semibold text-green-200 hover:bg-green-500/10">Convert</Link>
        )}
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-200">{value}</p>
    </div>
  );
}

function countStatus(quotes: Quote[], status: QuoteStatus) {
  return quotes.filter(quote => quote.status === status).length;
}

function emailQuote(quote: Quote) {
  window.location.href = quoteEmailHref(quote);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default Quotes;
