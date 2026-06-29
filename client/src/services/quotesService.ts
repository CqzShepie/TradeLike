import { apiClient } from "./apiClient";
import type { Quote, QuoteLineItem } from "../types/quote";
import type { NewQuote, NewQuoteLineItem } from "../types/newQuote";

type QuotePayload = {
  customerId: number;
  customerName: string;
  title: string;
  description: string | null;
  discountTotal: number;
  status: Quote["status"];
  notes: string | null;
  lineItems: NewQuoteLineItem[];
};

export const quotesService = {
  async getAll() {
    const quotes = await apiClient.get<Quote[]>("/quotes");
    return quotes.map(normaliseQuote);
  },

  async getById(id: number) {
    const quote = await apiClient.get<Quote>(`/quotes/${id}`);
    return normaliseQuote(quote);
  },

  async create(quote: NewQuote) {
    const created = await apiClient.post<Quote>("/quotes", toPayload(quote));
    return normaliseQuote(created);
  },

  async update(quote: Quote) {
    const updated = await apiClient.put<Quote>(
      `/quotes/${quote.id}`,
      toPayload(quote)
    );

    return normaliseQuote(updated);
  },

  delete(id: number) {
    return apiClient.delete<Quote>(`/quotes/${id}`);
  },
};

// Backwards-compatible alias in case any older file imports quoteService.
export const quoteService = quotesService;

function toPayload(quote: NewQuote | Quote): QuotePayload {
  return {
    customerId: Number(quote.customerId),
    customerName: quote.customerName.trim(),
    title: quote.title.trim(),
    description: quote.description?.trim() || null,
    discountTotal: Number(quote.discountTotal || 0),
    status: quote.status,
    notes: quote.notes?.trim() || null,
    lineItems: quote.lineItems.map(item => ({
      type: item.type,
      description: item.description.trim(),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      vatRate: Number(item.vatRate || 0),
    })),
  };
}

function normaliseQuote(quote: Quote): Quote {
  const lineItems = quote.lineItems ?? [];

  return {
    ...quote,
    amount: Number(quote.amount ?? quote.total ?? 0),
    subtotal: Number(quote.subtotal ?? 0),
    vatTotal: Number(quote.vatTotal ?? 0),
    discountTotal: Number(quote.discountTotal ?? 0),
    total: Number(quote.total ?? quote.amount ?? 0),
    lineItems: lineItems.map(normaliseLineItem),
  };
}

function normaliseLineItem(item: QuoteLineItem): QuoteLineItem {
  return {
    ...item,
    type: item.type,
    description: item.description ?? "",
    quantity: Number(item.quantity ?? 0),
    unitPrice: Number(item.unitPrice ?? 0),
    vatRate: Number(item.vatRate ?? 0),
    lineTotal: Number(item.lineTotal ?? 0),
  };
}