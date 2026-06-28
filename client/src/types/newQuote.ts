export type NewQuote = {
  customerId: number;
  customerName: string;

  title: string;
  description?: string;

  amount: number;
  status: "Draft" | "Sent" | "Accepted" | "Rejected";
};