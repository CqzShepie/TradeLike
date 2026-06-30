import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import { invoicesService } from "../services/invoicesService";
import type { Invoice, InvoiceStatus } from "../services/invoicesService";
import { jobsService } from "../services/jobsService";
import { quotesService } from "../services/quotesService";
import type { Job } from "../types/job";
import type { Quote } from "../types/quote";

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const statuses: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Overdue", "Void"];

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "All">("All");
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const [jobRows, quoteRows] = await Promise.all([jobsService.getAll(), quotesService.getAll()]);
      setJobs(jobRows);
      setQuotes(quoteRows);
      setInvoices(invoicesService.getAll());
    }

    load();
  }, []);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return invoices.filter(invoice => {
      const matchesStatus = statusFilter === "All" || invoice.status === statusFilter;
      const matchesSearch = query === "" || [
        invoice.invoiceNumber,
        invoice.customerName,
        invoice.title,
        invoice.status,
        invoice.quoteId ? `quote ${invoice.quoteId}` : "",
        invoice.jobId ? `job ${invoice.jobId}` : "",
      ].join(" ").toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [invoices, search, statusFilter]);

  const totals = useMemo(() => ({
    total: invoices.reduce((sum, invoice) => sum + invoice.total, 0),
    paid: invoices.filter(invoice => invoice.status === "Paid").reduce((sum, invoice) => sum + invoice.total, 0),
    outstanding: invoices.filter(invoice => invoice.status !== "Paid" && invoice.status !== "Void").reduce((sum, invoice) => sum + invoice.total, 0),
  }), [invoices]);

  function refresh() {
    setInvoices(invoicesService.getAll());
  }

  function createFromQuote() {
    const quote = quotes.find(item => item.id === Number(selectedQuoteId));
    if (!quote) return;
    const invoice = invoicesService.createFromQuote(quote);
    refresh();
    setSelectedQuoteId("");
    setMessage(`Created ${invoice.invoiceNumber} from Quote #${quote.id}.`);
  }

  function createFromJob() {
    const job = jobs.find(item => item.id === Number(selectedJobId));
    if (!job) return;
    const invoice = invoicesService.createFromJob(job);
    refresh();
    setSelectedJobId("");
    setMessage(`Created ${invoice.invoiceNumber} from Job #${job.id}.`);
  }

  function updateStatus(id: number, status: InvoiceStatus) {
    setInvoices(invoicesService.updateStatus(id, status));
  }

  function deleteInvoice(id: number) {
    if (!confirm("Delete this invoice?")) return;
    setInvoices(invoicesService.delete(id));
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <section className="min-w-0 flex-1 p-10">
        <div className="max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Invoices</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">Invoices</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Create invoices from quotes or jobs, track draft/sent/paid/overdue status, and keep customer billing connected to job and quote history.
              </p>
            </div>
          </div>

          {message && <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">{message}</div>}

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Stat label="Total invoiced" value={money.format(totals.total)} />
            <Stat label="Paid" value={money.format(totals.paid)} />
            <Stat label="Outstanding" value={money.format(totals.outstanding)} />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
            <section className="space-y-6">
              <Panel title="Create from quote">
                <div className="grid gap-3">
                  <select value={selectedQuoteId} onChange={event => setSelectedQuoteId(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600">
                    <option value="">Choose quote</option>
                    {quotes.map(quote => <option key={quote.id} value={quote.id}>#{quote.id} {quote.customerName} · {quote.title} · {money.format(Number(quote.total ?? 0))}</option>)}
                  </select>
                  <button type="button" onClick={createFromQuote} disabled={!selectedQuoteId} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300">Create invoice from quote</button>
                </div>
              </Panel>

              <Panel title="Create from job">
                <div className="grid gap-3">
                  <select value={selectedJobId} onChange={event => setSelectedJobId(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600">
                    <option value="">Choose job</option>
                    {jobs.map(job => <option key={job.id} value={job.id}>#{job.id} {job.customer} · {job.jobTitle}</option>)}
                  </select>
                  <button type="button" onClick={createFromJob} disabled={!selectedJobId} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300">Create invoice from job</button>
                </div>
              </Panel>
            </section>

            <Panel title="Invoice list">
              <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search invoice, customer, job, quote..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600" />
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as InvoiceStatus | "All")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"><option value="All">All statuses</option>{statuses.map(status => <option key={status} value={status}>{status}</option>)}</select>
              </div>

              <div className="mt-4 max-h-[680px] divide-y divide-slate-200 overflow-y-auto pr-2">
                {filteredInvoices.map(invoice => <article key={invoice.id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_140px_140px_90px]"><div className="min-w-0"><p className="font-bold text-slate-900">{invoice.invoiceNumber} · {invoice.title}</p><p className="mt-1 text-sm text-slate-600">{invoice.customerName} · Due {formatDate(invoice.dueDate)}</p><div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-blue-700">{invoice.jobId && <Link to={`/jobs/${invoice.jobId}`}>Job #{invoice.jobId}</Link>}{invoice.quoteId && <Link to={`/quotes/${invoice.quoteId}`}>Quote #{invoice.quoteId}</Link>}</div></div><select value={invoice.status} onChange={event => updateStatus(invoice.id, event.target.value as InvoiceStatus)} className="h-fit rounded-lg border border-slate-300 px-3 py-2 text-sm">{statuses.map(status => <option key={status} value={status}>{status}</option>)}</select><p className="h-fit rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-900">{money.format(invoice.total)}</p><button type="button" onClick={() => deleteInvoice(invoice.id)} className="h-fit rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button></article>)}
                {filteredInvoices.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No invoices yet.</p>}
              </div>
            </Panel>
          </div>
        </div>
      </section>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">{title}</h2><div className="mt-4">{children}</div></section>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></div>;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-GB");
}
