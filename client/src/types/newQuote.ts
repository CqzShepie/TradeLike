import type { QuoteStatus } from "./quote";

export type NewQuote = {
    customerId: number;
    customerName: string;

    title: string;
    description?: string | null;

    amount: number;

    status: QuoteStatus;

    notes?: string | null;
};