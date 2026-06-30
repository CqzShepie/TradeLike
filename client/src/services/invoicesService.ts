import type { Job } from "../types/job";
import type { Quote } from "../types/quote";

export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Void";

export type Invoice = {
  id: number;
  invoiceNumber: string;
  customerId?: number | null;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  jobId?: number | null;
  quoteId?: number | null;
  title: string;
  description?: string;
  subtotal: number;
  vatTotal: number;
  total: number;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt?: string | null;
};

const storageKey = "tradelike_invoices";

export const invoicesService = {
  getAll() {
    return loadInvoices();
  },

  createFromQuote(quote: Quote) {
    const invoices = loadInvoices();
    const existing = invoices.find(invoice => invoice.quoteId === quote.id);
    if (existing) return existing;

    const invoice = createInvoice({
      customerId: quote.customerId,
      customerName: quote.customerName,
      quoteId: quote.id,
      title: quote.title,
      description: quote.description,
      subtotal: Number(quote.subtotal ?? quote.amount ?? quote.total ?? 0),
      vatTotal: Number(quote.vatTotal ?? 0),
      total: Number(quote.total ?? quote.amount ?? 0),
      notes: quote.notes ?? "",
    });

    saveInvoices([invoice, ...invoices]);
    return invoice;
  },

  createFromJob(job: Job) {
    const invoices = loadInvoices();
    const existing = invoices.find(invoice => invoice.jobId === job.id);
    if (existing) return existing;

    const sourceQuote = job.sourceQuote;
    const invoice = createInvoice({
      customerId: sourceQuote?.customerId ?? null,
      customerName: sourceQuote?.customerName || job.customer,
      customerPhone: job.phone,
      jobId: job.id,
      quoteId: job.quoteId ?? sourceQuote?.id ?? null,
      title: job.jobTitle,
      description: job.notes ?? sourceQuote?.description ?? "",
      subtotal: Number(sourceQuote?.subtotal ?? sourceQuote?.amount ?? sourceQuote?.total ?? 0),
      vatTotal: Number(sourceQuote?.vatTotal ?? 0),
      total: Number(sourceQuote?.total ?? sourceQuote?.amount ?? 0),
      notes: job.notes ?? "",
    });

    saveInvoices([invoice, ...invoices]);
    return invoice;
  },

  updateStatus(id: number, status: InvoiceStatus) {
    const now = new Date().toISOString();
    const invoices = loadInvoices().map(invoice => invoice.id === id ? {
      ...invoice,
      status,
      paidAt: status === "Paid" ? now : invoice.paidAt ?? null,
      updatedAt: now,
    } : invoice);
    saveInvoices(invoices);
    return invoices;
  },

  delete(id: number) {
    const invoices = loadInvoices().filter(invoice => invoice.id !== id);
    saveInvoices(invoices);
    return invoices;
  },
};

function createInvoice(input: Partial<Invoice> & { customerName: string; title: string; total: number }) {
  const invoices = loadInvoices();
  const id = Math.max(0, ...invoices.map(invoice => invoice.id)) + 1;
  const now = new Date();
  const due = new Date(now);
  due.setDate(due.getDate() + 14);

  return {
    id,
    invoiceNumber: `INV-${String(id).padStart(5, "0")}`,
    customerId: input.customerId ?? null,
    customerName: input.customerName,
    customerEmail: input.customerEmail ?? "",
    customerPhone: input.customerPhone ?? "",
    jobId: input.jobId ?? null,
    quoteId: input.quoteId ?? null,
    title: input.title,
    description: input.description ?? "",
    subtotal: Number(input.subtotal ?? input.total ?? 0),
    vatTotal: Number(input.vatTotal ?? 0),
    total: Number(input.total ?? 0),
    status: "Draft" as InvoiceStatus,
    dueDate: due.toISOString(),
    paidAt: null,
    notes: input.notes ?? "",
    createdAt: now.toISOString(),
    updatedAt: null,
  } satisfies Invoice;
}

function loadInvoices() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [] as Invoice[];

  try {
    const parsed = JSON.parse(raw) as Invoice[];
    return parsed.map(invoice => ({
      ...invoice,
      subtotal: Number(invoice.subtotal ?? 0),
      vatTotal: Number(invoice.vatTotal ?? 0),
      total: Number(invoice.total ?? 0),
    }));
  } catch {
    return [] as Invoice[];
  }
}

function saveInvoices(invoices: Invoice[]) {
  localStorage.setItem(storageKey, JSON.stringify(invoices));
}
