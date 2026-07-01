import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Badge, PrimaryButton, SecondaryButton, StatusBadge, TextInput } from "../ui";
import { isApiError } from "../../services/apiClient";
import { jobsService } from "../../services/jobsService";
import { quotesService } from "../../services/quotesService";
import type { Job } from "../../types/job";
import type { Quote } from "../../types/quote";

type JobQuoteLinkPanelProps = {
  job: Job | null;
  onJobChange?: (job: Job) => void;
};

export default function JobQuoteLinkPanel({
  job,
  onJobChange,
}: JobQuoteLinkPanelProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [panelJob, setPanelJob] = useState<Job | null>(job);

  useEffect(() => {
    setPanelJob(job);
  }, [job]);

  const linkedQuote = panelJob?.sourceQuote ?? null;
  const linkedQuoteId = panelJob?.quoteId ?? linkedQuote?.id ?? null;
  const linkedSummary = linkedQuote ?? (linkedQuoteId ? quoteStub(panelJob, linkedQuoteId) : null);

  const filteredQuotes = useMemo(() => {
    const search = query.trim().toLowerCase();
    const rows = quotes
      .filter(quote => {
        if (!search) {
          return true;
        }

        return [
          `quote ${quote.id}`,
          `quote #${quote.id}`,
          String(quote.id),
          quote.customerName,
          quote.title,
          quote.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((left, right) => {
        const leftSameCustomer = left.customerId === panelJob?.customerId || left.customerName === panelJob?.customer;
        const rightSameCustomer = right.customerId === panelJob?.customerId || right.customerName === panelJob?.customer;

        if (leftSameCustomer !== rightSameCustomer) {
          return leftSameCustomer ? -1 : 1;
        }

        if ((left.status === "Rejected") !== (right.status === "Rejected")) {
          return left.status === "Rejected" ? 1 : -1;
        }

        return right.id - left.id;
      });

    return rows;
  }, [panelJob?.customer, panelJob?.customerId, query, quotes]);

  async function openSelector() {
    setSelectorOpen(true);
    setError("");

    if (quotes.length > 0) {
      return;
    }

    try {
      setLoadingQuotes(true);
      setQuotes(await quotesService.getAll());
    } catch {
      setError("Unable to load quotes.");
    } finally {
      setLoadingQuotes(false);
    }
  }

  async function linkQuote(quote: Quote) {
    if (!panelJob) {
      setError("Save the job first to link a quote.");
      return;
    }

    if (linkedQuoteId && linkedQuoteId !== quote.id && !window.confirm("Replace the currently linked quote?")) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      const updated = await jobsService.linkQuote(panelJob.id, quote.id);
      setPanelJob(updated);
      onJobChange?.(updated);
      setSelectorOpen(false);
      setQuery("");
      toast.success("Quote linked to job.");
    } catch (err) {
      setError(getQuoteLinkError(err));
    } finally {
      setSaving(false);
    }
  }

  async function unlinkQuote() {
    if (!panelJob || !linkedQuoteId) {
      return;
    }

    if (!window.confirm("Unlink this quote from the job?")) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      const updated = await jobsService.unlinkQuote(panelJob.id);
      setPanelJob(updated);
      onJobChange?.(updated);
      toast.success("Quote unlinked from job.");
    } catch (err) {
      setError(getQuoteLinkError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Linked quote</p>
          {!panelJob && (
            <p className="mt-2 text-sm text-slate-400">
              Save the job first to link a quote.
            </p>
          )}
        </div>

        {panelJob && (
          <PrimaryButton type="button" size="sm" onClick={openSelector} disabled={saving}>
            {linkedSummary ? "Change quote" : "Link quote"}
          </PrimaryButton>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm font-medium text-red-100">
          {error}
        </p>
      )}

      {panelJob && linkedSummary ? (
        <div className="mt-4 rounded-lg border border-blue-400/20 bg-blue-500/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Quote #{linkedSummary.id}</p>
              <p className="mt-1 text-sm text-slate-300">{linkedSummary.title}</p>
              <p className="mt-1 text-xs text-slate-400">{linkedSummary.customerName}</p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <StatusBadge status={linkedSummary.status} />
              <span className="text-sm font-semibold text-blue-100">{formatCurrency(linkedSummary.total)}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/quotes/${linkedSummary.id}`} className="rounded-lg border border-blue-400/30 px-3 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-500/10">
              View quote
            </Link>
            <SecondaryButton type="button" size="sm" onClick={openSelector} disabled={saving}>
              Change quote
            </SecondaryButton>
            <SecondaryButton type="button" size="sm" onClick={unlinkQuote} disabled={saving}>
              Unlink quote
            </SecondaryButton>
          </div>
        </div>
      ) : panelJob ? (
        <p className="mt-4 rounded-lg border border-dashed border-white/10 bg-slate-900 p-4 text-sm text-slate-400">
          No quote linked
        </p>
      ) : null}

      {selectorOpen && (
        <QuoteSelectorModal
          quotes={filteredQuotes}
          loading={loadingQuotes}
          query={query}
          selectedQuoteId={linkedQuoteId}
          saving={saving}
          onQueryChange={setQuery}
          onClose={() => setSelectorOpen(false)}
          onSelect={linkQuote}
        />
      )}
    </section>
  );
}

function QuoteSelectorModal({
  quotes,
  loading,
  query,
  selectedQuoteId,
  saving,
  onQueryChange,
  onClose,
  onSelect,
}: {
  quotes: Quote[];
  loading: boolean;
  query: string;
  selectedQuoteId: number | null;
  saving: boolean;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onSelect: (quote: Quote) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-selector-title"
        className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 text-white shadow-2xl shadow-slate-950/60"
      >
        <div className="border-b border-white/10 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Quote selector</p>
              <h2 id="quote-selector-title" className="mt-1 text-2xl font-bold">Link quote</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-slate-200 hover:bg-white/10">
              Close
            </button>
          </div>
          <TextInput
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            placeholder="Search quote number, customer, title or status"
            className="mt-5"
          />
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-6">
          {loading && <p className="text-sm text-slate-400">Loading quotes...</p>}

          {!loading && quotes.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 bg-slate-900 p-6 text-center">
              <p className="text-sm font-semibold text-slate-200">No quotes found</p>
              <Link to="/quotes" className="mt-4 inline-flex rounded-lg border border-blue-400/30 px-3 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/10">
                Create quote
              </Link>
            </div>
          )}

          <div className="space-y-3">
            {!loading && quotes.map(quote => (
              <button
                key={quote.id}
                type="button"
                disabled={saving || quote.id === selectedQuoteId}
                onClick={() => onSelect(quote)}
                className="block w-full rounded-xl border border-white/10 bg-slate-900/80 p-4 text-left transition hover:border-blue-400/40 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">Quote #{quote.id} - {quote.title}</p>
                    <p className="mt-1 text-sm text-slate-300">{quote.customerName}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <StatusBadge status={quote.status} />
                    <span className="text-sm font-semibold text-blue-100">{formatCurrency(quote.total)}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {quote.id === selectedQuoteId && <Badge tone="blue">Currently linked</Badge>}
                  {quote.status === "Rejected" && <Badge tone="red">Rejected</Badge>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function quoteStub(job: Job | null | undefined, quoteId: number): Quote {
  return {
    id: quoteId,
    customerId: job?.customerId ?? 0,
    customerName: job?.customer ?? "Customer not recorded",
    title: `Quote #${quoteId}`,
    description: null,
    amount: 0,
    subtotal: 0,
    vatTotal: 0,
    discountType: "Amount",
    discountValue: 0,
    discountTotal: 0,
    total: 0,
    status: "Draft",
    notes: null,
    createdAt: "",
    lineItems: [],
  };
}

function getQuoteLinkError(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 403) {
      return "You do not have permission to link quotes.";
    }

    if (error.status === 404) {
      return "Quote not found.";
    }

    if (error.status === 400) {
      return error.message || "This quote cannot be linked to the job.";
    }
  }

  return "Unable to update quote link.";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value || 0));
}
