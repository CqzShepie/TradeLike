import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import JobDetailsAssignmentPanel from "../components/jobs/JobDetailsAssignmentPanel";
import { ProductPage, ProductPanel } from "../components/ui";
import type { Job, JobPriority, JobStatus } from "../types/job";
import { jobsService } from "../services/jobsService";
import { formatDateTime, formatPhone, toDateTimeLocalValue } from "../utils/inputFormatters";
import { createStoredNote, parseStoredNote, splitStoredNotes } from "../utils/jobNotes";
import { authService } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import { canUseStaffScheduling } from "../routes/planEntitlements";

const statuses: JobStatus[] = ["Scheduled", "InProgress", "Completed", "Cancelled"];
const priorities: JobPriority[] = ["Low", "Normal", "High", "Urgent"];

export default function JobDetails() {
  const { id } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [form, setForm] = useState<Job | null>(null);
  const [editing, setEditing] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState("");
  const [newNote, setNewNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { user } = useAuth();
  const showStaffScheduling = canUseStaffScheduling(user);

  useEffect(() => {
    const jobId = Number(id);

    if (!Number.isFinite(jobId)) {
      setError("Invalid job ID.");
      return;
    }

    jobsService
      .getById(jobId)
      .then(row => {
        setJob(row);
        setForm(row);
      })
      .catch(() => setError("Unable to load job."));
  }, [id]);

  const notes = useMemo(() => splitStoredNotes(job?.notes), [job?.notes]);

  async function saveJob(event?: FormEvent) {
    event?.preventDefault();

    if (!form) {
      return;
    }

    const updated = await jobsService.update(form);
    setJob(updated);
    setForm(updated);
    setEditing(false);
    setMessage("Job saved.");
  }

  async function linkQuote(event: FormEvent) {
    event.preventDefault();

    if (!job) {
      return;
    }

    const quoteId = Number(quoteNumber);

    if (!Number.isInteger(quoteId) || quoteId <= 0) {
      setError("Enter a valid quote number.");
      return;
    }

    const updated = await jobsService.linkQuote(job.id, quoteId);
    setJob(updated);
    setForm(updated);
    setQuoteNumber("");
    setMessage(`Linked Quote #${quoteId}.`);
  }

  async function unlinkQuote() {
    if (!job) {
      return;
    }

    const updated = await jobsService.unlinkQuote(job.id);
    setJob(updated);
    setForm(updated);
    setMessage("Quote link removed.");
  }

  async function saveNotes(nextNotes: string[]) {
    if (!job) {
      return;
    }

    const updated = await jobsService.update({ ...job, notes: nextNotes.join("\n") || null });
    setJob(updated);
    setForm(updated);
  }

  async function addNote() {
    const value = newNote.trim();

    if (!value) {
      return;
    }

    const user = authService.getUser();
    const author = user?.name || user?.email || "Team member not recorded";

    await saveNotes([createStoredNote(author, value), ...notes]);
    setNewNote("");
    setMessage("Note added.");
  }

  async function removeNote(index: number) {
    await saveNotes(notes.filter((_, itemIndex) => itemIndex !== index));
    setMessage("Note removed.");
  }

  return (
    <ProductPage>
      <Link to="/jobs" className="text-sm font-semibold text-blue-300 hover:text-blue-200">
        Back to Jobs
      </Link>

      {error && <Alert tone="error" onClose={() => setError("")}>{error}</Alert>}
      {message && <Alert tone="success" onClose={() => setMessage("")}>{message}</Alert>}

      {!job && !error && (
        <ProductPanel>
          <p className="text-sm text-slate-300">Loading job...</p>
        </ProductPanel>
      )}

      {job && form && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <ProductPanel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Job #{job.id}</p>
                <h1 className="mt-1 text-3xl font-bold text-white">{job.jobTitle}</h1>
                <p className="mt-2 text-sm text-slate-300">{job.customer} - {formatDateTime(job.scheduledDate)}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(value => !value)}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
              >
                {editing ? "Cancel edit" : "Edit"}
              </button>
            </div>

            {editing ? (
              <JobEditForm form={form} setForm={setForm} onSubmit={saveJob} />
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Info label="Customer" value={`${job.customer}${job.customerId ? ` - Customer ID ${job.customerId}` : ""}`} />
                <Info label="Linked quote" value={job.quoteId ? `Quote #${job.quoteId}` : "No linked quote"} />
                <Info label="Status" value={job.status === "InProgress" ? "In Progress" : job.status} />
                <Info label="Priority" value={job.priority} />
                <Info label="Phone" value={formatPhone(job.phone)} />
                <Info label="Address" value={job.address || "No address"} />
                <Info label="Scheduled" value={formatDateTime(job.scheduledDate)} />
              </div>
            )}

            <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <h2 className="text-lg font-bold text-white">Customer Notes</h2>
              <div className="mt-4 flex gap-2">
                <input
                  value={newNote}
                  onChange={event => setNewNote(event.target.value)}
                  placeholder="Add a note..."
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
                <button type="button" onClick={addNote} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500">
                  Add
                </button>
              </div>
              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-2">
                {notes.length === 0 && (
                  <p className="rounded-lg border border-dashed border-white/10 bg-slate-900 p-4 text-sm text-slate-400">
                    No notes added yet.
                  </p>
                )}
                {notes.map((note, index) => (
                  <NoteCard key={`${note}-${index}`} note={note} onRemove={() => removeNote(index)} />
                ))}
              </div>
            </div>
          </ProductPanel>

          <aside className="space-y-6">
            {showStaffScheduling && <JobDetailsAssignmentPanel job={job} />}
            <ProductPanel>
              <h2 className="text-lg font-bold text-white">Quote link</h2>
              <form onSubmit={linkQuote} className="mt-4 flex gap-2">
                <input
                  value={quoteNumber}
                  onChange={event => setQuoteNumber(event.target.value)}
                  placeholder="Quote number"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
                <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
                  Link
                </button>
              </form>
              {job.quoteId && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={`/quotes/${job.quoteId}`} className="rounded-lg border border-blue-400/30 px-3 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-500/10">
                    Open quote
                  </Link>
                  <button type="button" onClick={unlinkQuote} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10">
                    Remove link
                  </button>
                </div>
              )}
            </ProductPanel>
          </aside>
        </div>
      )}
    </ProductPage>
  );
}

function NoteCard({ note, onRemove }: { note: string; onRemove: () => void }) {
  const parsed = parseStoredNote(note);
  const meta = [parsed.author, parsed.dateLabel].filter(Boolean).join(" - ");

  return (
    <div className="relative rounded-lg border border-white/10 bg-slate-900 p-4 pr-24 text-sm text-slate-300">
      <button type="button" onClick={onRemove} className="absolute right-3 top-3 rounded border border-red-400/30 px-2 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/10">
        Remove
      </button>
      <p className="whitespace-pre-wrap pr-4 leading-6 text-slate-100">{parsed.body}</p>
      {meta && <p className="mt-3 text-xs font-medium text-slate-500">{meta}</p>}
    </div>
  );
}

function JobEditForm({ form, setForm, onSubmit }: { form: Job; setForm: (job: Job) => void; onSubmit: (event: FormEvent) => void }) {
  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
      <Field label="Job needed"><Input value={form.jobTitle} onChange={value => setForm({ ...form, jobTitle: value })} /></Field>
      <Field label="Customer"><Input value={form.customer} onChange={value => setForm({ ...form, customer: value })} /></Field>
      <Field label="Phone"><Input value={form.phone} onChange={value => setForm({ ...form, phone: formatPhone(value) })} /></Field>
      <Field label="Scheduled">
        <input type="datetime-local" value={toDateTimeLocalValue(form.scheduledDate)} onChange={event => setForm({ ...form, scheduledDate: event.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" />
      </Field>
      <Field label="Status">
        <select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as JobStatus })} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white">
          {statuses.map(status => <option key={status} value={status}>{status === "InProgress" ? "In Progress" : status}</option>)}
        </select>
      </Field>
      <Field label="Priority">
        <select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value as JobPriority })} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white">
          {priorities.map(priority => <option key={priority} value={priority}>{priority}</option>)}
        </select>
      </Field>
      <div className="md:col-span-2"><Field label="Address"><Input value={form.address} onChange={value => setForm({ ...form, address: value })} /></Field></div>
      <div className="md:col-span-2">
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          Save job
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>{children}</label>;
}

function Input({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" />;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm font-medium text-slate-100">{value}</p></div>;
}

function Alert({ tone, children, onClose }: { tone: "error" | "success"; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className={`flex items-start justify-between gap-4 rounded-xl border p-4 text-sm font-semibold ${tone === "error" ? "border-red-400/30 bg-red-950/30 text-red-100" : "border-green-400/30 bg-green-950/30 text-green-100"}`}>
      <span>{children}</span>
      <button type="button" onClick={onClose} className="rounded px-2 text-lg leading-none hover:bg-white/10">x</button>
    </div>
  );
}
