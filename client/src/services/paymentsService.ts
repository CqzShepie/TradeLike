import { apiClient } from "./apiClient";

export const paymentsService = {
  checkout(invoiceId: number, provider: "stripe" | "gocardless" = "stripe") {
    return apiClient.post<{ checkoutUrl: string }>("/payments/checkout", {
      invoiceId,
      provider,
    });
  },
};
