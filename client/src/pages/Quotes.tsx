import { useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import StatsGrid from "../components/ui/StatsGrid";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import NewQuoteForm from "../components/quotes/NewQuoteForm";
import QuoteList from "../components/quotes/QuoteList";

import type { Quote } from "../types/quote";
import { useQuotes } from "../hooks/useQuotes";

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
  } = useQuotes();

  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);

  const filteredQuotes = quotes.filter(
    (quote) =>
      statusFilter === "All" || quote.status === statusFilter
  );

  const stats = [
    {
      title: "Total Quotes",
      value: quotes.length,
    },
    {
      title: "Draft",
      value: quotes.filter((q) => q.status === "Draft").length,
    },
    {
      title: "Sent",
      value: quotes.filter((q) => q.status === "Sent").length,
    },
    {
      title: "Accepted",
      value: quotes.filter((q) => q.status === "Accepted").length,
    },
  ];

  if (loading) {
    return (
      <main className="flex min-h-screen bg-slate-50">
        <Sidebar />

        <section className="flex-1 p-10">
          <DashboardHeader
            title="Quotes"
            subtitle="Loading quotes..."
          />

          <div className="mt-10 animate-pulse space-y-4">
            <div className="h-24 rounded-xl bg-slate-200" />
            <div className="h-64 rounded-xl bg-slate-200" />
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen bg-slate-50">
        <Sidebar />

        <section className="flex-1 p-10">
          <DashboardHeader
            title="Quotes"
            subtitle="Something went wrong"
          />

          <div className="mt-10 rounded-xl border bg-white p-6">
            <p className="text-red-600">{error}</p>

            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <section className="flex-1 p-10">
        <DashboardHeader
          title="Quotes"
          subtitle="Manage all customer quotes."
        />

        <StatsGrid stats={stats} />

        {editingQuote && (
          <p className="mt-6 text-sm text-blue-600">
            Editing: {editingQuote.title}
          </p>
        )}

        <div className="mt-6">
          <Button onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? "Close Form" : "+ New Quote"}
          </Button>
        </div>

        {(showForm || editingQuote) && (
          <div className="mt-6">
            <NewQuoteForm
              onAddQuote={addQuote}
              onUpdateQuote={updateQuote}
              editingQuote={editingQuote}
              onCancelEdit={() => {
                cancelEdit();
                setShowForm(false);
              }}
            />
          </div>
        )}

        <div className="mt-6 flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="mt-6">
          <QuoteList
            quotes={filteredQuotes}
            onEditQuote={(quote) => {
              startEdit(quote);
              setShowForm(true);
            }}
            onDeleteQuote={setQuoteToDelete}
          />
        </div>

        {quoteToDelete && (
          <Modal
            title="Delete Quote"
            onClose={() => setQuoteToDelete(null)}
          >
            <p className="mb-6">
              Are you sure you want to delete{" "}
              <strong>{quoteToDelete.title}</strong>?
            </p>

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setQuoteToDelete(null)}
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                onClick={() => {
                  deleteQuote(quoteToDelete.id);
                  setQuoteToDelete(null);
                }}
              >
                Delete
              </Button>
            </div>
          </Modal>
        )}
      </section>
    </main>
  );
}

export default Quotes;