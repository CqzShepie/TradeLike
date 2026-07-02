import { apiClient } from "./apiClient";
import type { StorageUsage } from "./storageService";

export type AdminStorageTenant = {
  tenantId: number;
  businessName?: string | null;
  email?: string | null;
  usage: StorageUsage;
};

export const adminStorageService = {
  async getTenantStorage(tenantId: number) {
    return await apiClient.get<AdminStorageTenant>(`/admin/storage/${tenantId}`);
  },

  async recalculateTenantStorage(tenantId: number) {
    return await apiClient.post<StorageUsage>(`/admin/storage/${tenantId}/recalculate`, {});
  },

  async setManualOverride(tenantId: number, manualStorageOverrideBytes: number | null, reason: string) {
    return await apiClient.put<AdminStorageTenant>(`/admin/storage/${tenantId}/override`, {
      manualStorageOverrideBytes,
      reason,
    });
  },
};
