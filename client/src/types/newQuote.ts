import type {
    QuoteLineItemType,
    QuoteStatus,
} from "./quote";

export type NewQuoteLineItem = {
    type: QuoteLineItemType;
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
};

export type NewQuote = {
    customerId: number;
    customerName: string;

    title: string;
    description?: string | null;

    discountTotal: number;

    status: QuoteStatus;

    notes?: string | null;

    lineItems: NewQuoteLineItem[];
};