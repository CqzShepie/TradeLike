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
    description?: string;

    amount: number;

    status: QuoteStatus;

    createdAt: string;
};