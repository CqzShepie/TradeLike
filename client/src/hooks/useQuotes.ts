import { useEffect, useState } from "react";
import { quotesService } from "../services/quotesService";
import type { Quote } from "../types/quote";
import type { NewQuote } from "../types/newQuote";

export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadQuotes() {
    try {
      setLoading(true);
      setError(null);

      const data = await quotesService.getAll();
      setQuotes(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unable to load quotes."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuotes();
  }, []);

  async function addQuote(newQuote: NewQuote) {
    const created = await quotesService.create(newQuote);
    setQuotes(previous => [created, ...previous]);

    return created;
  }

  async function updateQuote(updatedQuote: Quote) {
    const updated = await quotesService.update(updatedQuote);

    setQuotes(previous =>
      previous.map(quote => (quote.id === updated.id ? updated : quote))
    );

    setEditingQuote(null);

    return updated;
  }

  async function deleteQuote(id: number) {
    await quotesService.delete(id);

    setQuotes(previous => previous.filter(quote => quote.id !== id));
  }

  function startEdit(quote: Quote) {
    setEditingQuote(quote);
  }

  function cancelEdit() {
    setEditingQuote(null);
  }

  return {
    quotes,
    loading,
    error,
    addQuote,
    updateQuote,
    deleteQuote,
    startEdit,
    editingQuote,
    cancelEdit,
    reloadQuotes: loadQuotes,
  };
}
