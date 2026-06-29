import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import DashboardHeader from "../components/dashboard/WelcomeBanner";
import StatsGrid from "../components/ui/StatsGrid";
import Modal from "../components/ui/Modal";
import NewQuoteForm from "../components/quotes/NewQuoteForm";
import QuoteList from "../components/quotes/QuoteList";
import type { Quote, QuoteStatus } from "../types/quote";
import { useQuotes } from "../hooks/useQuotes";
import { formatMoney } from "../utils/formatMoney";

type QuoteStatusFilter = QuoteStatus | "All";

function Quotes() {
  const {
    quotes,
    loading,
    error,
    addQuote,
    deleteQuote,
    updateQuote,
    startEdit,
    editingQuote,
    cancelEdit,
    reloadQuotes,
  } = useQuotes();

  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>("All");
  const [showForm, setShowForm] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const filteredQuotes = quotes.filter(
    quote => statusFilter === "All" || quote.status === statusFilter
  );

  const totalValue = quotes.reduce(
    (sum, quote) => sum + (quote.total || quote.amount || 0),
    0
  );

  const stats = [
    {
      title: "Total Quotes",
      value: quotes.length,
    },
    {
      title: "Total Value",
      value: formatMoney(totalValue),
    },
    {
      title: "Sent",
      value: quotes.filter(quote => quote.status === "Sent").length,
    },
    {
      title: "Accepted",
      value: quotes.filter(quote => quote.status === "Accepted").length,
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading quotes...
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <p className="font-semibold">{error}</p>
            <button
              type="button"
              onClick={reloadQuotes}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 p-6">
        <DashboardHeader
          title="Quotes"
          subtitle="Create, price, edit, and manage customer quotes."
        />

        <div className="mt-6">
          <StatsGrid stats={stats} />
        </div>

        <section className="mt-6 space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Quote management
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Quote cards are clickable. Open a quote to review line items,
                VAT, discounts, and totals.
              </p>

              {editingQuote && (
                <p className="mt-2 text-sm font-medium text-blue-700">
                  Editing: {editingQuote.title}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={statusFilter}
                onChange={event =>
                  setStatusFilter(event.target.value as QuoteStatusFilter)
                }
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  if (editingQuote) {
                    cancelEdit();
                  }

                  setShowForm(previous => !previous);
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {showForm || editingQuote ? "Close Form" : "+ New Quote"}
              </button>
            </div>
          </div>

          {(showForm || editingQuote) && (
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
          )}

          <QuoteList
            quotes={filteredQuotes}
            onEditQuote={quote => {
              startEdit(quote);
              setShowForm(true);
            }}
            onDeleteQuote={quote => {
              setDeleteError("");
              setQuoteToDelete(quote);
            }}
          />
        </section>

        {quoteToDelete && (
          <Modal title="Delete quote" onClose={() => setQuoteToDelete(null)}>
            <div className="space-y-4">
              {deleteError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {deleteError}
                </div>
              )}

              <p className="text-sm text-slate-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900">
                  {quoteToDelete.title}
                </span>
                ?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setQuoteToDelete(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteQuote(quoteToDelete.id);
                      setQuoteToDelete(null);
                    } catch (err) {
                      setDeleteError(
                        err instanceof Error
                          ? err.message
                          : "Unable to delete quote."
                      );
                    }
                  }}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}

export default Quotes;