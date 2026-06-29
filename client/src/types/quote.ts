export type QuoteStatus =
    | "Draft"
    | "Sent"
    | "Accepted"
    | "Rejected";

export type Quote = {
    id: number;

    customerId: number;
    customerName: string;

    title: string;
    description?: string | null;

    amount: number;

    status: QuoteStatus;

    notes?: string | null;

    createdAt: string;
};