import { apiClient } from "./apiClient";
import type {
  BusinessSettings,
  UpdateBusinessSettingsRequest,
} from "../types/businessSettings";

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

export const businessSettingsService = {
  async getSettings() {
    return await apiClient.get<BusinessSettings>("/business-settings");
  },

  async updateSettings(request: UpdateBusinessSettingsRequest) {
    return await apiClient.put<BusinessSettings>("/business-settings", {
      businessName: clean(request.businessName),
      legalName: clean(request.legalName),
      logoUrl: clean(request.logoUrl),
      addressLine1: clean(request.addressLine1),
      addressLine2: clean(request.addressLine2),
      town: clean(request.town),
      county: clean(request.county),
      postcode: clean(request.postcode),
      country: clean(request.country),
      phone: clean(request.phone),
      email: clean(request.email),
      website: clean(request.website),
      vatNumber: clean(request.vatNumber),
      defaultVatRate: Number(request.defaultVatRate || 0),
      quotePrefix: clean(request.quotePrefix),
      invoicePrefix: clean(request.invoicePrefix),
      paymentTerms: clean(request.paymentTerms),
      bankName: clean(request.bankName),
      bankAccountName: clean(request.bankAccountName),
      bankSortCode: clean(request.bankSortCode),
      bankAccountNumber: clean(request.bankAccountNumber),
      emailFooter: clean(request.emailFooter),
    });
  },
};
