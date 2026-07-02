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

export type BillingPlanChangeResponse = BillingSubscription & {
  message: string;
};

export const billingService = {
  async getSubscription() {
    return (await apiClient.get("/billing/subscription")) as BillingSubscription;
  },

  async requestPlanChange(planName: string) {
    return await apiClient.post<BillingPlanChangeResponse>("/billing/plan-change", {
      planName,
      confirmed: true,
    });
  },
};
