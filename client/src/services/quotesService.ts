import { apiClient } from "./apiClient";
import type { Quote } from "../types/quote";
import type { NewQuote } from "../types/newQuote";

export const quotesService = {
    getAll: () =>
        apiClient.get<Quote[]>("/quotes"),

    getById: (id: number) =>
        apiClient.get<Quote>(`/quotes/${id}`),

    create: (quote: NewQuote) =>
        apiClient.post<Quote>("/quotes", {
            customerId: quote.customerId,
            customerName: quote.customerName,
            title: quote.title,
            description: quote.description ?? null,
            amount: Number(quote.amount),
            status: quote.status,
            notes: quote.notes ?? null,
        }),

    update: (quote: Quote) =>
        apiClient.put<Quote>(`/quotes/${quote.id}`, {
            customerId: quote.customerId,
            customerName: quote.customerName,
            title: quote.title,
            description: quote.description ?? null,
            amount: Number(quote.amount),
            status: quote.status,
            notes: quote.notes ?? null,
        }),

    delete: (id: number) =>
        apiClient.delete<void>(`/quotes/${id}`),
};