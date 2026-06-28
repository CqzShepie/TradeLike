import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { Quote } from "../types/quote";
import type { NewQuote } from "../types/newQuote";
import { quotesService } from "../services/quotesService";

export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuotes() {
      try {
        const data = await quotesService.getAll();
        setQuotes(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load quotes.");
        toast.error("Failed to load quotes.");
      } finally {
        setLoading(false);
      }
    }

    loadQuotes();
  }, []);

  async function addQuote(quote: NewQuote) {
    try {
      const created = await quotesService.create(quote);
      setQuotes((prev) => [...prev, created]);
      toast.success("Quote created!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create quote.");
    }
  }

  async function deleteQuote(id: number) {
    try {
      await quotesService.delete(id);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      toast.success("Quote deleted!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete quote.");
    }
  }

  async function updateQuote(updated: Quote) {
    try {
      const res = await quotesService.update(updated);

      setQuotes((prev) =>
        prev.map((q) => (q.id === res.id ? res : q))
      );

      setEditingQuote(null);
      toast.success("Quote updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update quote.");
    }
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
    deleteQuote,
    updateQuote,
    editingQuote,
    startEdit,
    cancelEdit,
  };
}