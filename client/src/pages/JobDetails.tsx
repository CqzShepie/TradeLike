import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Sidebar from "../components/layout/Sidebar";
import type { Job, JobPriority, JobStatus } from "../types/job";
import { jobsService } from "../services/jobsService";
import { formatMoney } from "../utils/formatMoney";

const statuses: JobStatus[] = [
  "Scheduled",
  "InProgress",
  "Completed",
  "Cancelled",
];

const priorities: JobPriority[] = ["Low", "Normal", "High", "Urgent"];

export default function JobDetails() {
  const { id } = useParams();

  const [job, setJob] = useState<Job | null>(null);
  const [form, setForm] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadJob() {
      const jobId = Number(id);

      if (!Number.isFinite(jobId) || jobId <= 0) {
        setError("Invalid job ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await jobsService.getById(jobId);

        setJob(data);
        setForm(data);
      } catch (err) {
        setError(getErrorMessage(err, "Unable to load job."));
      } finally {
        setLoading(false);
      }
    }

    loadJob();
  }, [id]);

  const sourceQuote = job?.sourceQuote ?? null;

  const quoteLineItems = useMemo(() => {
    return sourceQuote?.lineItems ?? [];
  }, [sourceQuote]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    if (!form) return;

    if (form.customer.trim() === "") {
      setError("Customer is required.");
      return;
    }

    if (form.phone.trim() === "") {
      setError("Phone number is required.");
      return;
    }

    if (form.jobTitle.trim() === "") {
      setError("Job title is required.");
      return;
    }

    if (form.address.trim() === "") {
      setError("Address is required.");
      return;
    }

    if (!form.scheduledDate) {
      setError("Scheduled date is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const updated = await jobsService.update({
        ...form,
        customer: form.customer.trim(),
        phone: form.phone.trim(),
        jobTitle: form.jobTitle.trim(),
        address: form.address.trim(),
        notes: form.notes?.trim() || null,
      });

      setJob(updated);
      setForm(updated);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save job."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <main className="md:pl-64">
        <section className="mx-auto max-w-7xl px-6 py-8">
          <Link
            to="/jobs"
            className="text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            ← Back to Jobs
          </Link>

          {loading && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading job...
            </div>
          )}

          {!loading && error && !job && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {!loading && job && form && (
            <>
              <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Job #{job.id}
                  </p>
                  <h1 className="mt-1 text-3xl font-bold text-slate-900">
                    {job.jobTitle}
                  </h1>
                  <p className="mt-2 text-sm text-slate-600">
                    {job.customer} · {formatDateTime(job.scheduledDate)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {formatStatus(job.status)}
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_420px]">
                <form
                  onSubmit={handleSave}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Job details
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Update schedule, status, site details, and internal job
                        notes.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Field label="Job title">
                      <input
                        value={form.jobTitle}
                        onChange={event =>
                          setForm({ ...form, jobTitle: event.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                      />
                    </Field>

                    <Field label="Customer">
                      <input
                        value={form.customer}
                        onChange={event =>
                          setForm({ ...form, customer: event.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                      />
                    </Field>

                    <Field label="Phone">
                      <input
                        value={form.phone}
                        onChange={event =>
                          setForm({ ...form, phone: event.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                      />
                    </Field>

                    <Field label="Scheduled date and time">
                      <input
                        type="datetime-local"
                        value={toDateTimeLocalValue(form.scheduledDate)}
                        onChange={event =>
                          setForm({
                            ...form,
                            scheduledDate: event.target.value,
                          })
                        }
                        min="2024-01-01T00:00"
                        max="2099-12-31T23:59"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                      />
                    </Field>

                    <Field label="Status">
                      <select
                        value={form.status}
                        onChange={event =>
                          setForm({
                            ...form,
                            status: event.target.value as JobStatus,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                      >
                        {statuses.map(status => (
                          <option key={status} value={status}>
                            {formatStatus(status)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Priority">
                      <select
                        value={form.priority}
                        onChange={event =>
                          setForm({
                            ...form,
                            priority: event.target.value as JobPriority,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                      >
                        {priorities.map(priority => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <div className="md:col-span-2">
                      <Field label="Address">
                        <input
                          value={form.address}
                          onChange={event =>
                            setForm({ ...form, address: event.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                        />
                      </Field>
                    </div>

                    <div className="md:col-span-2">
                      <Field label="Internal job notes">
                        <textarea
                          value={form.notes ?? ""}
                          onChange={event =>
                            setForm({ ...form, notes: event.target.value })
                          }
                          rows={8}
                          placeholder="Access notes, materials, customer preferences, risks, completion notes, etc."
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                        />
                      </Field>
                    </div>
                  </div>
                </form>

                <aside className="space-y-6">
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">
                      Job snapshot
                    </h2>

                    <div className="mt-5 space-y-4 text-sm">
                      <Snapshot label="Customer" value={job.customer} />
                      <Snapshot label="Phone" value={job.phone} />
                      <Snapshot label="Address" value={job.address} />
                      <Snapshot
                        label="Scheduled"
                        value={formatDateTime(job.scheduledDate)}
                      />
                      <Snapshot label="Status" value={formatStatus(job.status)} />
                      <Snapshot label="Priority" value={job.priority} />
                      <Snapshot
                        label="Source quote"
                        value={
                          job.quoteId ? (
                            <Link
                              to={`/quotes/${job.quoteId}`}
                              className="font-semibold text-blue-700 hover:text-blue-900"
                            >
                              Quote #{job.quoteId}
                            </Link>
                          ) : (
                            "No linked quote"
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-950">
                      {job.notes || "No job notes added yet."}
                    </p>
                  </div>
                </aside>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Invoice-ready source quote
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      {sourceQuote
                        ? `Quote #${sourceQuote.id}: ${sourceQuote.title}`
                        : job.quoteId
                        ? `Quote #${job.quoteId}`
                        : "No linked quote"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Converted jobs keep the original quote. This panel is here
                      so invoicing can be created later from the linked quote
                      totals and line items.
                    </p>
                  </div>

                  {sourceQuote && (
                    <Link
                      to={`/quotes/${sourceQuote.id}`}
                      className="inline-flex rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Open source quote
                    </Link>
                  )}
                </div>

                {!sourceQuote && (
                  <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    This job is not linked to a quote. Existing jobs still work
                    normally; they just do not have quote totals or line items to
                    show here.
                  </div>
                )}

                {sourceQuote && (
                  <>
                    <div className="mt-6 grid gap-4 md:grid-cols-4">
                      <MoneyCard
                        label="Subtotal before VAT"
                        value={sourceQuote.subtotal}
                      />
                      <MoneyCard label="VAT total" value={sourceQuote.vatTotal} />
                      <MoneyCard
                        label={
                          sourceQuote.discountType === "Percentage"
                            ? `Discount (${sourceQuote.discountValue}%)`
                            : "Discount"
                        }
                        value={sourceQuote.discountTotal}
                        negative
                      />
                      <MoneyCard
                        label="Quote total"
                        value={sourceQuote.total}
                        strong
                      />
                    </div>

                    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                      <div className="grid grid-cols-[1.2fr_3fr_0.8fr_1fr_0.8fr_1fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <div>Type</div>
                        <div>Description</div>
                        <div>Qty</div>
                        <div>Unit</div>
                        <div>VAT</div>
                        <div className="text-right">Line total</div>
                      </div>

                      {quoteLineItems.length === 0 ? (
                        <div className="px-4 py-5 text-sm text-slate-500">
                          No quote line items were found for this source quote.
                        </div>
                      ) : (
                        quoteLineItems.map((item, index) => (
                          <div
                            key={item.id ?? index}
                            className="grid grid-cols-[1.2fr_3fr_0.8fr_1fr_0.8fr_1fr] gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-700"
                          >
                            <div className="font-medium text-slate-900">
                              {item.type}
                            </div>
                            <div>{item.description}</div>
                            <div>{item.quantity}</div>
                            <div>{formatMoney(item.unitPrice)}</div>
                            <div>{item.vatRate}%</div>
                            <div className="text-right font-bold text-slate-900">
                              {formatMoney(item.lineTotal)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {sourceQuote.description && (
                      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Quote overview
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {sourceQuote.description}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function Snapshot({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-1 font-medium text-slate-900">{value}</div>
    </div>
  );
}

function MoneyCard({
  label,
  value,
  negative = false,
  strong = false,
}: {
  label: string;
  value: number;
  negative?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 ${
          strong ? "text-2xl" : "text-xl"
        } font-bold text-slate-900`}
      >
        {negative ? "-" : ""}
        {formatMoney(value)}
      </p>
    </div>
  );
}

function formatDateTime(value: string) {
  if (!value) {
    return "No date set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(value: string) {
  return value === "InProgress" ? "In Progress" : value;
}

function toDateTimeLocalValue(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - offsetMs);

  return localDate.toISOString().slice(0, 16);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== ""
    ? error.message
    : fallback;
}