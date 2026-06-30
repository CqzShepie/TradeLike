import { authService } from "./authService";
import type { Job } from "../types/job";

export type CustomerAuditEntry = {
  id: number;
  customerId: number;
  staffName: string;
  staffEmail: string;
  action: string;
  details: string;
  targetType: "Customer" | "Job" | "Quote" | "Invoice" | "Staff" | "Team" | "Settings";
  targetId?: number | null;
  createdAt: string;
};

const storageKey = "tradelike_customer_audit_entries";

export const customerAuditService = {
  getForCustomer(customerId: number) {
    return loadEntries()
      .filter(entry => entry.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  log(entry: Omit<CustomerAuditEntry, "id" | "staffName" | "staffEmail" | "createdAt">) {
    const user = authService.getUser();
    const next: CustomerAuditEntry = {
      ...entry,
      id: Date.now(),
      staffName: user?.name || user?.email || "Unknown staff member",
      staffEmail: user?.email || "Unknown email",
      createdAt: new Date().toISOString(),
    };
    saveEntries([next, ...loadEntries()].slice(0, 500));
    return next;
  },

  logJob(action: string, job: Job, details: string) {
    const customerId = job.customerId ?? job.sourceQuote?.customerId ?? null;
    if (!customerId) return null;
    return this.log({ customerId, action, details, targetType: "Job", targetId: job.id });
  },
};

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as CustomerAuditEntry[];
  } catch {
    return [] as CustomerAuditEntry[];
  }
}

function saveEntries(entries: CustomerAuditEntry[]) {
  localStorage.setItem(storageKey, JSON.stringify(entries));
}
