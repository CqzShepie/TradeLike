import type { Invoice } from "../services/invoicesService";
import type { Quote } from "../types/quote";

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export function quoteEmailHref(quote: Quote) {
  const subject = `Quote #${quote.id}: ${quote.title}`;
  const body = [
    `Hi ${firstName(quote.customerName)},`,
    "",
    `Please find your quote below:`,
    "",
    `Quote: #${quote.id}`,
    `Title: ${quote.title}`,
    `Total: ${money.format(Number(quote.total ?? quote.amount ?? 0))}`,
    "",
    "Reply to this email if you have any questions or would like to go ahead.",
    "",
    "Kind regards,",
  ].join("\n");

  return createMailto("", subject, body);
}

export function invoiceEmailHref(invoice: Invoice) {
  const subject = `${invoice.invoiceNumber}: ${invoice.title}`;
  const body = [
    `Hi ${firstName(invoice.customerName)},`,
    "",
    `Please find your invoice below:`,
    "",
    `Invoice: ${invoice.invoiceNumber}`,
    `Title: ${invoice.title}`,
    `Amount due: ${money.format(Number(invoice.total ?? 0))}`,
    `Due date: ${formatDate(invoice.dueDate)}`,
    "",
    "Reply to this email if you have any questions.",
    "",
    "Kind regards,",
  ].join("\n");

  return createMailto(invoice.customerEmail ?? "", subject, body);
}

function createMailto(to: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "not set" : date.toLocaleDateString("en-GB");
}
