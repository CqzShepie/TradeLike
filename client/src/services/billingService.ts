import { apiClient } from "./apiClient";

export type BillingSubscription = {
  planName: string;
  monthlyPricePence?: number | null;
  maxIncludedUsers?: number | null;
  seatsPurchased: number;
  billingStartUtc: string;
  nextInvoiceDateUtc: string;
  status: string;
};

export const billingService = {
  async getSubscription() {
    return (await apiClient.get("/billing/subscription")) as BillingSubscription;
  },
};
