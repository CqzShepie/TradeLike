import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import Sidebar from "../components/layout/Sidebar";
import type { Customer } from "../types/customer";
import type { Job } from "../types/job";
import type { Quote } from "../types/quote";
import { customerAuditService } from "../services/customerAuditService";
import { customersService } from "../services/customersService";
import { invoicesService } from "../services/invoicesService";
import type { Invoice } from "../services/invoicesService";
import { jobsService } from "../services/jobsService";
import { quotesService } from "../services/quotesService";
import { useAuth } from "../hooks/useAuth";
import { canViewCustomerHistory } from "../routes/planEntitlements";
import { formatCurrency, formatPhone, formatShortDate, isValidOptionalUkPhone } from "../utils/inputFormatters";
import { filterInvoicesForCustomer, filterJobsForCustomer, filterQuotesForCustomer } from "../utils/customerRecordMatching";

type CustomerTab = "overview" | "billing" | "jobs" | "quotes" | "invoices" | "emails" | "notes" | "timeline" | "audit";
type TimelineItem = { id: string; date: string; title: string; body: string; href: string };

const tabs: Array<{ id: CustomerTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "billing", label: "Billing" },
  { id: "jobs", label: "Jobs" },
  { id: "quotes", label: "Quotes" },
  { id: "invoices", label: "Invoices" },
  { id: "emails", label: "Emails sent" },
  { id: "notes", label: "Notes" },
  { id: "timeline", label: "Timeline" },
  { id: "audit", label: "Audit history" },
];

const pinnedKey = "tradelike_pinned_timeline_items";

export default function CustomerDetails() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<CustomerTab>("overview");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);
  const [auditVersion, setAuditVersion] = useState(0);
  const [pinnedTimelineIds, setPinnedTimelineIds] = useState<string[]>(() => readPinned());
  const { user } = useAuth();
  const showCustomerHistory = canViewCustomerHistory(user);
  const visibleTabs = useMemo(
    () => showCustomerHistory ? tabs : tabs.filter(tab => tab.id !== "timeline" && tab.id !== "audit"),
    [showCustomerHistory]
  );

  useEffect(() => {
    if (!showCustomerHistory && (activeTab === "timeline" || activeTab === "audit")) {
      setActiveTab("overview");
    }
  }, [activeTab, showCustomerHistory]);

  useEffect(() => {
    async function loadCustomer() {
      const customerId = Number(id);
      if (!Number.isFinite(customerId)) {
        setError("Invalid customer ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        setMessage("");
        const [customerData, allJobs, allQuotes] = await Promise.all([customersService.getById(customerId), jobsService.getAll(), quotesService.getAll()]);
        const customerQuotes = filterQuotesForCustomer(allQuotes, customerData);
        const customerJobs = filterJobsForCustomer(allJobs, customerData, customerQuotes);
        const customerInvoices = filterInvoicesForCustomer(invoicesService.getAll(), customerData, customerQuotes, customerJobs);
        setCustomer(customerData);
        setForm({ ...customerData, phone: formatPhone(customerData.phone) });
        setQuotes(customerQuotes);
        setJobs(customerJobs);
        setInvoices(customerInvoices);
      } catch {
        setError("Unable to load customer.");
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [id]);

  const currentJobs = useMemo(() => jobs.filter(job => !isPreviousJob(job)), [jobs]);
  const previousJobs = useMemo(() => jobs.filter(isPreviousJob), [jobs]);
  const quoteTotal = quotes.reduce((total, quote) => total + Number(quote.total || 0), 0);
  const invoiceTotal = invoices.reduce((total, invoice) => total + invoice.total, 0);
  const outstandingTotal = invoices.filter(invoice => invoice.status !== "Paid" && invoice.status !== "Void").reduce((total, invoice) => total + invoice.total, 0);
  const openJobs = currentJobs.filter(job => job.status !== "Completed" && job.status !== "Cancelled");
  const auditItems = customer && showCustomerHistory ? customerAuditService.getForCustomer(customer.id) : [];
  const filteredAuditItems = auditItems.filter(item => [item.action, item.details, item.staffName, item.staffEmail, item.createdAt, item.targetType, String(item.targetId ?? "")].join(" ").toLowerCase().includes(auditSearch.trim().toLowerCase()));
  const selectedAudit = filteredAuditItems.find(item => item.id === selectedAuditId) ?? null;

  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (!showCustomerHistory) return [];
    const quoteItems = quotes.map(quote => ({ id: `quote-${quote.id}`, date: quote.createdAt, title: `Quote ${quote.status.toLowerCase()}`, body: `${cleanDisplayText(quote.title)} - ${formatCurrency(quote.total)}`, href: `/quotes/${quote.id}` }));
    const jobItems = jobs.map(job => ({ id: `job-${job.id}`, date: job.scheduledDate, title: `Job ${job.status.toLowerCase()}`, body: `${cleanDisplayText(job.jobTitle)} - ${job.priority} priority`, href: `/jobs/${job.id}` }));
    const invoiceItems = invoices.map(invoice => ({ id: `invoice-${invoice.id}`, date: invoice.createdAt, title: `Invoice ${invoice.status.toLowerCase()}`, body: `${cleanDisplayText(invoice.invoiceNumber)} - ${formatCurrency(invoice.total)}`, href: "/invoices" }));
    return [...quoteItems, ...jobItems, ...invoiceItems].sort((left, right) => Number(pinnedTimelineIds.includes(right.id)) - Number(pinnedTimelineIds.includes(left.id)) || new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [jobs, quotes, invoices, pinnedTimelineIds, showCustomerHistory]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    if (form.name.trim() === "") {
      setError("Customer name is required.");
      setMessage("");
      return;
    }

    if (!isValidOptionalUkPhone(form.phone)) {setError("Customer phone number must be 11 digits, for example 07981 125031.");setMessage("");return;}

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const updated = await customersService.update({ ...form, name: form.name.trim(), phone: formatPhone(form.phone), email: form.email.trim(), address: form.address.trim(), notes: form.notes?.trim() || null });
      setCustomer(updated);
      setForm({ ...updated, phone: formatPhone(updated.phone) });
      customerAuditService.log({ customerId: updated.id, action: "Customer edited", details: `Updated contact details for ${updated.name}.`, targetType: "Customer", targetId: updated.id });
      setAuditVersion(value => value + 1);
      setMessage("Customer saved.");
    } catch {
      setError("Unable to save customer.");
      setMessage("");
    } finally {
      setSaving(false);
    }
  }

  function createInvoiceFromQuote(quote: Quote) {
    const invoice = invoicesService.createFromQuote(quote);
    if (customer) customerAuditService.log({ customerId: customer.id, action: "Invoice created", details: `Created ${invoice.invoiceNumber} from Quote #${quote.id}.`, targetType: "Invoice", targetId: invoice.id });
    setInvoices(filterInvoicesForCustomer(invoicesService.getAll(), customer!, quotes, jobs));
    setAuditVersion(value => value + 1);
    setActiveTab("invoices");
    setMessage(`Created ${invoice.invoiceNumber} from Quote #${quote.id}.`);
  }

  function createInvoiceFromJob(job: Job) {
    const invoice = invoicesService.createFromJob(job);
    if (customer) customerAuditService.log({ customerId: customer.id, action: "Invoice created", details: `Created ${invoice.invoiceNumber} from Job #${job.id}.`, targetType: "Invoice", targetId: invoice.id });
    setInvoices(filterInvoicesForCustomer(invoicesService.getAll(), customer!, quotes, jobs));
    setAuditVersion(value => value + 1);
    setActiveTab("invoices");
    setMessage(`Created ${invoice.invoiceNumber} from Job #${job.id}.`);
  }

  function togglePin(id: string) {
    const next = pinnedTimelineIds.includes(id) ? pinnedTimelineIds.filter(item => item !== id) : [id, ...pinnedTimelineIds];
    setPinnedTimelineIds(next);
    localStorage.setItem(pinnedKey, JSON.stringify(next));
  }

  function deleteAuditEntry(entryId: number) {
    if (!customer || !window.confirm("Permanently delete this audit history entry?")) return;
    customerAuditService.deleteForCustomer(customer.id, entryId);
    setSelectedAuditId(null);
    setAuditVersion(value => value + 1);
    setMessage("Audit entry deleted.");
  }

  void auditVersion;

  return (
    <main className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <section className="flex-1 p-10">
        <div className="mb-6"><Link to="/customers" className="text-sm font-medium text-blue-400 hover:underline">Back to Customers</Link></div>
        {loading && <p className="text-slate-300">Loading customer...</p>}
        {!loading && error && <Alert tone="error" onClose={() => setError("")}>{error}</Alert>}
        {!loading && !error && customer && form && (
          <div className="space-y-6">
            <header className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Customer ID {customer.id}</p><h1 className="mt-1 text-3xl font-bold text-white">{customer.name}</h1><p className="mt-2 text-sm text-slate-300">{customer.email || "No email"} - {formatPhone(customer.phone) || "No phone"}</p></div>
                <div className="grid gap-3 sm:grid-cols-4"><MiniStat label="Open jobs" value={openJobs.length} /><MiniStat label="Previous jobs" value={previousJobs.length} /><MiniStat label="Quotes" value={quotes.length} /><MiniStat label="Invoice value" value={formatCurrency(invoiceTotal)} /></div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">{visibleTabs.map(tab => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === tab.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{tab.label}</button>)}</div>
            </header>
            {message && <Alert tone="success" onClose={() => setMessage("")}>{message}</Alert>}

            {activeTab === "overview" && <div className="grid gap-6 xl:grid-cols-[1fr_360px]"><form onSubmit={handleSave} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm shadow-slate-950/40"><div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-white">Overview</h2><p className="mt-1 text-sm text-slate-300">Core contact details and important information for this customer.</p></div><button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-slate-400">{saving ? "Saving..." : "Save changes"}</button></div><div className="grid gap-4 md:grid-cols-2"><Field label="Name"><Input value={form.name} onChange={value => setForm({ ...form, name: value })} /></Field><Field label="Phone"><Input value={form.phone} onChange={value => setForm({ ...form, phone: formatPhone(value) })} /></Field><Field label="Email"><Input value={form.email} onChange={value => setForm({ ...form, email: value })} /></Field><Field label="Address"><Input value={form.address} onChange={value => setForm({ ...form, address: value })} /></Field><div className="md:col-span-2"><Field label="Important Information"><textarea value={form.notes ?? ""} onChange={event => setForm({ ...form, notes: event.target.value })} rows={5} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600" /></Field></div></div></form><aside className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm shadow-slate-950/40"><h2 className="text-lg font-bold text-white">Customer snapshot</h2><div className="mt-5 space-y-4 text-sm"><Snapshot label="Phone" value={formatPhone(customer.phone) || "Not added"} /><Snapshot label="Email" value={customer.email || "Not added"} /><Snapshot label="Address" value={customer.address || "Not added"} /><Snapshot label="Important Information" value={customer.notes || "Not added"} /><Snapshot label="Open jobs" value={String(openJobs.length)} /><Snapshot label="Previous jobs" value={String(previousJobs.length)} /><Snapshot label="Outstanding invoices" value={formatCurrency(outstandingTotal)} /></div></aside></div>}
            {activeTab === "billing" && <Panel title="Billing"><div className="grid gap-4 md:grid-cols-4"><MiniStat label="Total quotes" value={formatCurrency(quoteTotal)} /><MiniStat label="Invoices" value={formatCurrency(invoiceTotal)} /><MiniStat label="Outstanding" value={formatCurrency(outstandingTotal)} /><MiniStat label="Invoices" value={invoices.length} onClick={() => setActiveTab("invoices")} /></div></Panel>}
            {activeTab === "jobs" && <Panel title="Jobs"><div className="mb-4"><Link to="/jobs" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Create job</Link></div>{jobs.length === 0 ? <EmptyState>No jobs found for this customer.</EmptyState> : <div className="space-y-6"><JobGroup title="Current jobs" jobs={currentJobs} onInvoice={createInvoiceFromJob} /><JobGroup title="Previous jobs" jobs={previousJobs} onInvoice={createInvoiceFromJob} /></div>}</Panel>}
            {activeTab === "quotes" && <Panel title="Quotes"><div className="mb-4"><Link to="/quotes" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Create quote</Link></div>{quotes.length === 0 ? <EmptyState>No quotes found for this customer.</EmptyState> : <div className="divide-y divide-slate-200">{quotes.map(quote => <div key={quote.id} className="grid gap-2 py-4 hover:bg-slate-50 md:grid-cols-[1fr_130px_130px_150px]"><Link to={`/quotes/${quote.id}`}><p className="font-semibold text-slate-900">{quote.title}</p><p className="mt-1 text-sm text-slate-500">Created {formatShortDate(quote.createdAt)}</p></Link><Badge>{quote.status}</Badge><Badge>{formatCurrency(quote.total)}</Badge><button type="button" onClick={() => createInvoiceFromQuote(quote)} className="h-fit rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Create invoice</button></div>)}</div>}</Panel>}
            {activeTab === "invoices" && <Panel title="Invoices"><div className="mb-4"><Link to="/invoices" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Create invoice</Link></div>{invoices.length === 0 ? <EmptyState>No invoices found for this customer yet.</EmptyState> : <div className="divide-y divide-slate-200">{invoices.map(invoice => <Link key={invoice.id} to="/invoices" className="grid gap-2 py-4 hover:bg-slate-50 md:grid-cols-[1fr_130px_130px]"><div><p className="font-semibold text-slate-900">{cleanDisplayText(invoice.invoiceNumber)} - {cleanDisplayText(invoice.title)}</p><p className="mt-1 text-sm text-slate-500">Due {formatShortDate(invoice.dueDate)}</p></div><Badge>{invoice.status}</Badge><Badge>{formatCurrency(invoice.total)}</Badge></Link>)}</div>}</Panel>}
            {activeTab === "emails" && <Panel title="Emails sent"><EmptyState>Email send history will show here once backend email sending is connected.</EmptyState></Panel>}
            {activeTab === "notes" && <Panel title="Notes"><form onSubmit={handleSave} className="space-y-4"><Field label="Customer notes"><textarea value={form.notes ?? ""} onChange={event => setForm({ ...form, notes: event.target.value })} rows={10} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600" /></Field><button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400">{saving ? "Saving..." : "Save notes"}</button></form></Panel>}
            {activeTab === "timeline" && showCustomerHistory && <Panel title="Timeline">{timelineItems.length === 0 ? <EmptyState>Activity history is not available yet.</EmptyState> : <div className="space-y-3">{timelineItems.map(item => <div key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"><Link to={item.href} className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{pinnedTimelineIds.includes(item.id) ? "Pinned - " : ""}{cleanDisplayText(item.title)}</p><p className="mt-1 text-sm text-slate-600">{cleanDisplayText(item.body)}</p><p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{formatReadableDate(item.date)}</p></Link><button type="button" onClick={() => togglePin(item.id)} title="Pin or unpin timeline item" className="h-fit rounded-full border border-slate-300 px-3 py-1 text-sm font-bold text-slate-700 hover:bg-white">{pinnedTimelineIds.includes(item.id) ? "Unpin" : "Pin"}</button></div>)}</div>}</Panel>}
            {activeTab === "audit" && showCustomerHistory && <Panel title="Audit history"><input value={auditSearch} onChange={event => setAuditSearch(event.target.value)} placeholder="Search employees, emails, dates, quote names, invoice numbers or actions..." className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600" />{filteredAuditItems.length === 0 ? <EmptyState>Activity history is not available yet.</EmptyState> : <div className="grid gap-4 lg:grid-cols-[1fr_360px]"><div className="space-y-3">{filteredAuditItems.map(item => <button key={item.id} type="button" onClick={() => setSelectedAuditId(item.id)} className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-left hover:bg-white"><p className="font-semibold text-slate-900">{cleanDisplayText(item.action)}</p><p className="mt-1 line-clamp-2 text-sm text-slate-600">{cleanDisplayText(item.details)}</p><p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{cleanDisplayText(item.staffName)} - {cleanDisplayText(item.staffEmail)} - {formatReadableDate(item.createdAt)}</p></button>)}</div>{selectedAudit && <div className="h-fit rounded-lg border border-blue-100 bg-blue-50 p-4"><p className="font-bold text-slate-900">{cleanDisplayText(selectedAudit.action)}</p><p className="mt-2 text-sm text-slate-700">{cleanDisplayText(selectedAudit.details)}</p><p className="mt-3 text-xs font-semibold text-slate-500">{cleanDisplayText(selectedAudit.staffName)} - {cleanDisplayText(selectedAudit.staffEmail)}</p><p className="mt-1 text-xs font-semibold text-slate-500">{formatReadableDate(selectedAudit.createdAt)} - {cleanDisplayText(selectedAudit.targetType)} #{selectedAudit.targetId ?? "N/A"}</p><button type="button" onClick={() => deleteAuditEntry(selectedAudit.id)} className="mt-4 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Delete audit entry</button><p className="mt-2 text-xs text-slate-500">Audit entries can be deleted, but never edited.</p></div>}</div>}</Panel>}
          </div>
        )}
      </section>
    </main>
  );
}

function JobGroup({ title, jobs, onInvoice }: { title: string; jobs: Job[]; onInvoice: (job: Job) => void }) {
  return <section><h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h3>{jobs.length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">None.</p> : <div className="mt-3 divide-y divide-slate-200">{jobs.map(job => <div key={job.id} className="grid gap-2 py-4 hover:bg-slate-50 md:grid-cols-[1fr_130px_130px_150px]"><Link to={`/jobs/${job.id}`}><p className="font-semibold text-slate-900">#{job.id} {cleanDisplayText(job.jobTitle)}</p><p className="mt-1 text-sm text-slate-500">{cleanDisplayText(job.customer)} - {cleanDisplayText(job.address)}</p>{job.customerId && <p className="mt-1 text-xs font-semibold text-green-700">Linked customer #{job.customerId}</p>}{job.sourceQuote && <p className="mt-1 text-xs font-semibold text-blue-600">From quote #{job.sourceQuote.id} - {cleanDisplayText(job.sourceQuote.title)}</p>}</Link><Badge>{job.status}</Badge><Badge>{formatShortDate(job.scheduledDate)}</Badge><button type="button" onClick={() => onInvoice(job)} className="h-fit rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Create invoice</button></div>)}</div>}</section>;
}

function isPreviousJob(job: Job) { const today = new Date(); today.setHours(0, 0, 0, 0); return job.status === "Completed" || job.status === "Cancelled" || new Date(job.scheduledDate) < today; }
function readPinned() { try { return JSON.parse(localStorage.getItem(pinnedKey) ?? "[]") as string[]; } catch { return []; } }
function cleanDisplayText(value: string | number | null | undefined) { return String(value ?? "").replace(/Â·/g, "-").replace(/Ã¢/g, "").replace(/â€œ/g, "\"").replace(/â€/g, "\"").replace(/â€™/g, "'").replace(/â‹¯/g, "").replace(/ðŸ“Œ/g, "").replace(/[�ÂÃâð]/g, "").replace(/\s+-\s+/g, " - ").replace(/\s{2,}/g, " ").trim(); }
function formatReadableDate(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return "Date not recorded"; return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function Panel({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20 [&_.bg-slate-50]:!bg-slate-950/50 [&_.border-slate-200]:!border-white/10 [&_.divide-slate-200>*]:!border-white/10 [&_.text-slate-400]:!text-slate-500 [&_.text-slate-500]:!text-slate-400 [&_.text-slate-600]:!text-slate-300 [&_.text-slate-700]:!text-slate-200 [&_.text-slate-900]:!text-white"><h2 className="text-xl font-bold text-white">{title}</h2><div className="mt-5">{children}</div></section>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>{children}</label>; }
function Input({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <input value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40" />; }
function Snapshot({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-medium text-slate-100">{value}</p></div>; }
function MiniStat({ label, value, onClick }: { label: string | number; value: string | number; onClick?: () => void }) { const content = <><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-white">{value}</p></>; return onClick ? <button type="button" onClick={onClick} className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-left hover:bg-white/10">{content}</button> : <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">{content}</div>; }
function Badge({ children }: { children: ReactNode }) { return <span className="inline-flex h-fit w-fit rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-100">{children}</span>; }
function EmptyState({ children }: { children: ReactNode }) { return <div className="rounded-lg border border-dashed border-white/10 bg-slate-950/50 p-6 text-sm text-slate-400">{children}</div>; }
function Alert({ tone, children, onClose }: { tone: "success" | "error"; children: ReactNode; onClose: () => void }) { return <div className={`flex items-start justify-between gap-4 rounded-xl border p-4 text-sm font-medium ${tone === "success" ? "border-green-400/30 bg-green-950/30 text-green-100" : "border-red-400/30 bg-red-950/30 text-red-100"}`}><span>{children}</span><button type="button" onClick={onClose} className="rounded px-2 text-lg leading-none hover:bg-white/10">x</button></div>; }


