import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import type { Customer } from "../types/customer";
import type { Job } from "../types/job";
import type { Quote } from "../types/quote";
import { customersService } from "../services/customersService";
import { jobsService } from "../services/jobsService";
import { quotesService } from "../services/quotesService";

type CustomerTab =
  | "overview"
  | "billing"
  | "jobs"
  | "quotes"
  | "emails"
  | "notes"
  | "timeline"
  | "audit";

const tabs: Array<{ id: CustomerTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "billing", label: "Billing" },
  { id: "jobs", label: "Jobs" },
  { id: "quotes", label: "Quotes" },
  { id: "emails", label: "Emails sent" },
  { id: "notes", label: "Notes" },
  { id: "timeline", label: "Timeline" },
  { id: "audit", label: "Audit history" },
];

const money = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export default function CustomerDetails() {
  const { id } = useParams();

  const [activeTab, setActiveTab] = useState<CustomerTab>("overview");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

        const [customerData, allJobs, allQuotes] = await Promise.all([
          customersService.getById(customerId),
          jobsService.getAll(),
          quotesService.getAll(),
        ]);

        const customerQuotes = filterQuotesForCustomer(allQuotes, customerData);

        setCustomer(customerData);
        setForm(customerData);
        setQuotes(customerQuotes);
        setJobs(filterJobsForCustomer(allJobs, customerData, customerQuotes));
      } catch {
        setError("Unable to load customer.");
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [id]);

  const timelineItems = useMemo(() => {
    const quoteItems = quotes.map(quote => ({
      id: `quote-${quote.id}`,
      date: quote.createdAt,
      title: `Quote ${quote.status.toLowerCase()}`,
      body: `${quote.title} · ${money.format(quote.total)}`,
      href: `/quotes/${quote.id}`,
    }));

    const jobItems = jobs.map(job => ({
      id: `job-${job.id}`,
      date: job.scheduledDate,
      title: `Job ${job.status.toLowerCase()}`,
      body: `${job.jobTitle} · ${job.priority} priority`,
      href: `/jobs/${job.id}`,
    }));

    return [...quoteItems, ...jobItems].sort(
      (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
    );
  }, [jobs, quotes]);

  const quoteTotal = quotes.reduce((total, quote) => total + Number(quote.total || 0), 0);
  const acceptedQuotes = quotes.filter(quote => quote.status === "Accepted");
  const openJobs = jobs.filter(job => job.status !== "Completed" && job.status !== "Cancelled");

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    if (!form) {
      return;
    }

    if (form.name.trim() === "") {
      setError("Customer name is required.");
      setMessage("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updated = await customersService.update({
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        notes: form.notes?.trim() || null,
      });

      setCustomer(updated);
      setForm(updated);
      setMessage("Customer saved.");
    } catch {
      setError("Unable to save customer.");
      setMessage("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <section className="flex-1 p-10">
        <div className="mb-6">
          <Link to="/customers" className="text-sm font-medium text-blue-600 hover:underline">
            ← Back to Customers
          </Link>
        </div>

        {loading && <p className="text-slate-500">Loading customer...</p>}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && customer && form && (
          <div className="space-y-6">
            <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Customer 360 · #{customer.id}
                  </p>
                  <h1 className="mt-1 text-3xl font-bold text-slate-900">
                    {customer.name}
                  </h1>
                  <p className="mt-2 text-sm text-slate-600">
                    {customer.email || "No email"} · {customer.phone || "No phone"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Open jobs" value={openJobs.length} />
                  <MiniStat label="Quotes" value={quotes.length} />
                  <MiniStat label="Quote value" value={money.format(quoteTotal)} />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      activeTab === tab.id
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </header>

            {message && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                {message}
              </div>
            )}

            {activeTab === "overview" && (
              <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Overview</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Core contact details for this customer.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Name">
                      <Input value={form.name} onChange={value => setForm({ ...form, name: value })} />
                    </Field>
                    <Field label="Phone">
                      <Input value={form.phone} onChange={value => setForm({ ...form, phone: value })} />
                    </Field>
                    <Field label="Email">
                      <Input value={form.email} onChange={value => setForm({ ...form, email: value })} />
                    </Field>
                    <Field label="Address">
                      <Input value={form.address} onChange={value => setForm({ ...form, address: value })} />
                    </Field>
                  </div>
                </form>

                <aside className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">Customer snapshot</h2>
                  <div className="mt-5 space-y-4 text-sm">
                    <Snapshot label="Phone" value={customer.phone || "Not added"} />
                    <Snapshot label="Email" value={customer.email || "Not added"} />
                    <Snapshot label="Address" value={customer.address || "Not added"} />
                    <Snapshot label="Accepted quotes" value={String(acceptedQuotes.length)} />
                    <Snapshot label="Open jobs" value={String(openJobs.length)} />
                  </div>
                </aside>
              </div>
            )}

            {activeTab === "billing" && (
              <Panel title="Billing">
                <div className="grid gap-4 md:grid-cols-3">
                  <MiniStat label="Total quoted" value={money.format(quoteTotal)} />
                  <MiniStat label="Accepted quotes" value={acceptedQuotes.length} />
                  <MiniStat label="Pending quotes" value={quotes.filter(quote => quote.status === "Sent" || quote.status === "Draft").length} />
                </div>
                <p className="mt-5 text-sm text-slate-600">
                  Invoice history, credits, payment provider status, and refunds will plug into this tab when the invoices module is built.
                </p>
              </Panel>
            )}

            {activeTab === "jobs" && (
              <Panel title="Jobs">
                {jobs.length === 0 ? (
                  <EmptyState>No jobs found for this customer.</EmptyState>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {jobs.map(job => (
                      <Link key={job.id} to={`/jobs/${job.id}`} className="grid gap-2 py-4 hover:bg-slate-50 md:grid-cols-[1fr_130px_130px]">
                        <div>
                          <p className="font-semibold text-slate-900">{job.jobTitle}</p>
                          <p className="mt-1 text-sm text-slate-500">{job.address}</p>
                          {job.sourceQuote && <p className="mt-1 text-xs font-semibold text-blue-600">From quote #{job.sourceQuote.id} · {job.sourceQuote.title}</p>}
                        </div>
                        <Badge>{job.status}</Badge>
                        <Badge>{formatDate(job.scheduledDate)}</Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </Panel>
            )}

            {activeTab === "quotes" && (
              <Panel title="Quotes">
                {quotes.length === 0 ? (
                  <EmptyState>No quotes found for this customer.</EmptyState>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {quotes.map(quote => (
                      <Link key={quote.id} to={`/quotes/${quote.id}`} className="grid gap-2 py-4 hover:bg-slate-50 md:grid-cols-[1fr_130px_130px]">
                        <div>
                          <p className="font-semibold text-slate-900">{quote.title}</p>
                          <p className="mt-1 text-sm text-slate-500">Created {formatDate(quote.createdAt)}</p>
                        </div>
                        <Badge>{quote.status}</Badge>
                        <Badge>{money.format(quote.total)}</Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </Panel>
            )}

            {activeTab === "emails" && (
              <Panel title="Emails sent">
                <EmptyState>
                  Email send history will show here once quote, invoice, onboarding, and verification email logging is connected.
                </EmptyState>
              </Panel>
            )}

            {activeTab === "notes" && (
              <Panel title="Notes">
                <form onSubmit={handleSave} className="space-y-4">
                  <Field label="Customer notes">
                    <textarea
                      value={form.notes ?? ""}
                      onChange={event => setForm({ ...form, notes: event.target.value })}
                      rows={10}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                  </Field>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400"
                  >
                    {saving ? "Saving..." : "Save Notes"}
                  </button>
                </form>
              </Panel>
            )}

            {activeTab === "timeline" && (
              <Panel title="Timeline">
                {timelineItems.length === 0 ? (
                  <EmptyState>No jobs or quotes in the timeline yet.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {timelineItems.map(item => (
                      <Link key={item.id} to={item.href} className="block rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{formatDate(item.date)}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </Panel>
            )}

            {activeTab === "audit" && (
              <Panel title="Audit history">
                <EmptyState>
                  Full admin audit entries for this customer will appear here once audit filters are connected to customer records.
                </EmptyState>
              </Panel>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function filterJobsForCustomer(jobs: Job[], customer: Customer, customerQuotes: Quote[]) {
  const name = customer.name.trim().toLowerCase();
  const phone = customer.phone.trim().toLowerCase();
  const quoteIds = new Set(customerQuotes.map(quote => quote.id));

  return jobs.filter(job => {
    const sourceQuote = job.sourceQuote;

    return (
      job.customer.trim().toLowerCase() === name ||
      (phone !== "" && job.phone.trim().toLowerCase() === phone) ||
      (job.quoteId != null && quoteIds.has(job.quoteId)) ||
      sourceQuote?.customerId === customer.id ||
      sourceQuote?.customerName.trim().toLowerCase() === name
    );
  });
}

function filterQuotesForCustomer(quotes: Quote[], customer: Customer) {
  const name = customer.name.trim().toLowerCase();

  return quotes.filter(quote =>
    quote.customerId === customer.id ||
    quote.customerName.trim().toLowerCase() === name
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value}
      onChange={event => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
    />
  );
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string | number; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-fit w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
      {children}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
