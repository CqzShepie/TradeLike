import { apiClient } from "./apiClient";
import type { Quote } from "../types/quote";
import type { NewQuote } from "../types/newQuote";

export const quotesService = {
    getAll: () =>
        apiClient.get<Quote[]>("/quotes"),

    create: (quote: NewQuote) =>
        apiClient.post<Quote>("/quotes", {
            ...quote,
            amount: Number(quote.amount),
        }),

    update: (quote: Quote) =>
        apiClient.put<Quote>(`/quotes/${quote.id}`, {
            customerId: quote.customerId,
            customerName: quote.customerName,
            title: quote.title,
            description: quote.description,
            amount: Number(quote.amount),
            status: quote.status,
        }),

    delete: (id: number) =>
        apiClient.delete<void>(`/quotes/${id}`),
};