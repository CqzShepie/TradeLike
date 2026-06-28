import { apiClient } from "./apiClient";
import type { Quote } from "../types/quote";
import type { NewQuote } from "../types/newQuote";

export const quotesService = {
  getAll: () => apiClient.get<Quote[]>("/quotes"),

  create: (quote: NewQuote) =>
    apiClient.post<Quote>("/quotes", quote),

  update: (quote: Quote) =>
    apiClient.put<Quote>(`/quotes/${quote.id}`, quote),

  delete: (id: number) =>
    apiClient.delete<void>(`/quotes/${id}`),
};