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
            discountTotal: Number(quote.discountTotal || 0),
            status: quote.status,
            notes: quote.notes ?? null,
            lineItems: quote.lineItems.map(item => ({
                type: item.type,
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                vatRate: Number(item.vatRate),
            })),
        }),

    update: (quote: Quote) =>
        apiClient.put<Quote>(`/quotes/${quote.id}`, {
            customerId: quote.customerId,
            customerName: quote.customerName,
            title: quote.title,
            description: quote.description ?? null,
            discountTotal: Number(quote.discountTotal || 0),
            status: quote.status,
            notes: quote.notes ?? null,
            lineItems: quote.lineItems.map(item => ({
                type: item.type,
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                vatRate: Number(item.vatRate),
            })),
        }),

    delete: (id: number) =>
        apiClient.delete<void>(`/quotes/${id}`),
};