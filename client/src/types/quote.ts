export type QuoteStatus =
    | "Draft"
    | "Sent"
    | "Accepted"
    | "Rejected";

export type QuoteLineItemType =
    | "Labour"
    | "Materials"
    | "Other";

export type QuoteLineItem = {
    id?: number;
    quoteId?: number;

    type: QuoteLineItemType;
    description: string;

    quantity: number;
    unitPrice: number;
    vatRate: number;

    lineTotal: number;
};

export type Quote = {
    id: number;

    customerId: number;
    customerName: string;

    title: string;
    description?: string | null;

    amount: number;

    subtotal: number;
    vatTotal: number;
    discountTotal: number;
    total: number;

    status: QuoteStatus;

    notes?: string | null;

    createdAt: string;

    lineItems: QuoteLineItem[];
};