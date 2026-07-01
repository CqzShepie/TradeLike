import type { Customer } from "../types/customer";
import type { Job } from "../types/job";
import type { Quote } from "../types/quote";
import type { Invoice } from "../services/invoicesService";

export function normaliseRecordText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function filterQuotesForCustomer(quotes: Quote[], customer: Customer) {
  const name = normaliseRecordText(customer.name);
  return quotes.filter(quote => quote.customerId === customer.id || normaliseRecordText(quote.customerName) === name);
}

export function filterJobsForCustomer(jobs: Job[], customer: Customer, customerQuotes: Quote[]) {
  const name = normaliseRecordText(customer.name);
  const phone = normaliseRecordText(customer.phone);
  const quoteIds = new Set(customerQuotes.map(quote => quote.id));
  const quoteTitles = customerQuotes.map(quote => normaliseRecordText(quote.title)).filter(Boolean);

  return jobs.filter(job => {
    const sourceQuote = job.sourceQuote;
    const jobCustomer = normaliseRecordText(job.customer);
    const jobPhone = normaliseRecordText(job.phone);
    const jobTitle = normaliseRecordText(job.jobTitle);
    const sourceCustomerName = normaliseRecordText(sourceQuote?.customerName ?? "");

    return job.customerId === customer.id ||
      sourceQuote?.customerId === customer.id ||
      (job.quoteId != null && quoteIds.has(job.quoteId)) ||
      jobCustomer === name ||
      (name !== "" && jobCustomer.includes(name)) ||
      (jobCustomer !== "" && name.includes(jobCustomer)) ||
      (phone !== "" && jobPhone === phone) ||
      sourceCustomerName === name ||
      quoteTitles.some(title => title !== "" && (jobTitle === title || jobTitle.includes(title) || title.includes(jobTitle)));
  });
}

export function filterInvoicesForCustomer(invoices: Invoice[], customer: Customer, customerQuotes: Quote[], customerJobs: Job[]) {
  const name = normaliseRecordText(customer.name);
  const phone = normaliseRecordText(customer.phone);
  const quoteIds = new Set(customerQuotes.map(quote => quote.id));
  const jobIds = new Set(customerJobs.map(job => job.id));

  return invoices.filter(invoice =>
    invoice.customerId === customer.id ||
    normaliseRecordText(invoice.customerName) === name ||
    (phone !== "" && normaliseRecordText(invoice.customerPhone ?? "") === phone) ||
    (invoice.quoteId != null && quoteIds.has(invoice.quoteId)) ||
    (invoice.jobId != null && jobIds.has(invoice.jobId))
  );
}
