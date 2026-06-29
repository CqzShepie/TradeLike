import type { QuoteStatus } from "./quote";

export type NewQuote = {
    customerId: number;
    customerName: string;

    title: string;
    description?: string;

    amount: number;

    status: QuoteStatus;
};