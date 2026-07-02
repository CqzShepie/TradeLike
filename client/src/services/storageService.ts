import { apiClient } from "./apiClient";

export const STORAGE_LIMIT_BLOCKED_MESSAGE =
  "Storage limit reached. Existing files remain available, but new uploads are blocked.";

export type StorageAddOnPlan = {
  code: string;
  label: string;
  extraStorageBytes: number;
  monthlyPricePence: number;
  isActive: boolean;
};

export type TenantStorageAddOn = {
  id: number;
  code: string;
  label: string;
  extraStorageBytes: number;
  monthlyPricePence: number;
  status: string;
  currentPeriodEndUtc?: string | null;
  cancelAtPeriodEnd: boolean;
};

export type StorageUsage = {
  includedStorageBytes: number;
  purchasedStorageBytes: number;
  manualStorageOverrideBytes?: number | null;
  effectiveLimitBytes: number;
  usedStorageBytes: number;
  availableBytes: number;
  usedPercent: number;
  warningLevel: "OK" | "Warning" | "Critical" | "Blocked" | string;
  canUpload: boolean;
  addOnPlans: StorageAddOnPlan[];
  activeAddOns: TenantStorageAddOn[];
};

export const storageService = {
  async getUsage() {
    return await apiClient.get<StorageUsage>("/storage/usage");
  },

  async requestAddOn(code: string) {
    return await apiClient.post("/storage/add-ons", { code, confirmed: true });
  },

  async cancelAddOn(id: number) {
    return await apiClient.post(`/storage/add-ons/${id}/cancel`, { confirmed: true });
  },
};
