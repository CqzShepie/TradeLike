import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Sidebar from "../components/layout/Sidebar";
import JobDetailsAssignmentPanel from "../components/jobs/JobDetailsAssignmentPanel";
import type { Job, JobPriority, JobStatus } from "../types/job";
import { jobsService } from "../services/jobsService";

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

  useEffect(() => {
    const jobId = Number(id);
    if (!Number.isFinite(jobId)) {
      setError("Invalid job ID.");
      return;
    }
    jobsService.getById(jobId).then(row => { setJob(row); setForm(row); }).catch(() => setError("Unable to load job."));
  }, [id]);

  const notes = useMemo(() => splitNotes(job?.notes), [job?.notes]);

  async function saveJob(event?: FormEvent) {
    event?.preventDefault();
    if (!form) return;
    const updated = await jobsService.update(form);
    setJob(updated);
    setForm(updated);
    setEditing(false);
    setMessage("Job saved.");
  }

  async function linkQuote(event: FormEvent) {
    event.preventDefault();
    if (!job) return;
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
    if (!job) return;
    const updated = await jobsService.unlinkQuote(job.id);
    setJob(updated);
    setForm(updated);
    setMessage("Quote link removed.");
  }

  async function saveNotes(nextNotes: string[]) {
    if (!job) return;
    const updated = await jobsService.update({ ...job, notes: nextNotes.join("\n") || null });
    setJob(updated);
    setForm(updated);
  }

  async function addNote() {
    const value = newNote.trim();
    if (!value) return;
    await saveNotes([`${new Date().toLocaleString("en-GB")} — ${value}`, ...notes]);
    setNewNote("");
    setMessage("Note added.");
  }

  async function removeNote(index: number) {
    await saveNotes(notes.filter((_, itemIndex) => itemIndex !== index));
    setMessage("Note removed.");
  }

  return <div className="min-h-screen bg-slate-50"><Sidebar /><main className="md:pl-64"><section className="mx-auto max-w-7xl px-6 py-8"><Link to="/jobs" className="text-sm font-medium text-blue-700 hover:text-blue-900">← Back to Jobs</Link>{error && <Alert tone="error" onClose={() => setError("")}>{error}</Alert>}{message && <Alert tone="success" onClose={() => setMessage("")}>{message}</Alert>}{!job && !error && <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading job...</div>}{job && form && <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]"><section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Job #{job.id}</p><h1 className="mt-1 text-3xl font-bold text-slate-900">{job.jobTitle}</h1><p className="mt-2 text-sm text-slate-600">{job.customer} · {formatDate(job.scheduledDate)}</p></div><button type="button" onClick={() => setEditing(value => !value)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{editing ? "Cancel edit" : "Edit"}</button></div>{editing ? <JobEditForm form={form} setForm={setForm} onSubmit={saveJob} /> : <div className="mt-6 grid gap-4 md:grid-cols-2"><Info label="Customer" value={`${job.customer}${job.customerId ? ` · Customer ID ${job.customerId}` : ""}`} /><Info label="Linked quote" value={job.quoteId ? `Quote #${job.quoteId}` : "No linked quote"} /><Info label="Status" value={job.status === "InProgress" ? "In Progress" : job.status} /><Info label="Priority" value={job.priority} /><Info label="Phone" value={job.phone} /><Info label="Address" value={job.address || "No address"} /><Info label="Scheduled" value={formatDate(job.scheduledDate)} /></div>}<div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4"><h2 className="text-lg font-bold text-slate-900">Customer Notes</h2><p className="mt-1 text-xs font-semibold text-slate-500">Permission: Manage Customer Notes</p><div className="mt-4 flex gap-2"><input value={newNote} onChange={event => setNewNote(event.target.value)} placeholder="Add a note..." className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button type="button" onClick={addNote} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Add</button></div><div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-2">{notes.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No notes added yet.</p>}{notes.map((note, index) => <div key={`${note}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700"><p className="whitespace-pre-wrap">{note}</p><button type="button" onClick={() => removeNote(index)} className="mt-2 rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600">Remove</button></div>)}</div></div></section><aside className="space-y-6"><JobDetailsAssignmentPanel job={job} /><section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Quote link</h2><form onSubmit={linkQuote} className="mt-4 flex gap-2"><input value={quoteNumber} onChange={event => setQuoteNumber(event.target.value)} placeholder="Quote number" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Link</button></form>{job.quoteId && <div className="mt-3 flex flex-wrap gap-2"><Link to={`/quotes/${job.quoteId}`} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Open quote</Link><button type="button" onClick={unlinkQuote} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Remove link</button></div>}</section></aside></div>}</section></main></div>;
}

function JobEditForm({ form, setForm, onSubmit }: { form: Job; setForm: (job: Job) => void; onSubmit: (event: FormEvent) => void }) {
  return <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2"><Field label="Job title"><Input value={form.jobTitle} onChange={value => setForm({ ...form, jobTitle: value })} /></Field><Field label="Customer"><Input value={form.customer} onChange={value => setForm({ ...form, customer: value })} /></Field><Field label="Phone"><Input value={form.phone} onChange={value => setForm({ ...form, phone: value })} /></Field><Field label="Scheduled"><input type="datetime-local" value={toDateTimeLocalValue(form.scheduledDate)} onChange={event => setForm({ ...form, scheduledDate: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field><Field label="Status"><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as JobStatus })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">{statuses.map(status => <option key={status} value={status}>{status === "InProgress" ? "In Progress" : status}</option>)}</select></Field><Field label="Priority"><select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value as JobPriority })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">{priorities.map(priority => <option key={priority} value={priority}>{priority}</option>)}</select></Field><div className="md:col-span-2"><Field label="Address"><Input value={form.address} onChange={value => setForm({ ...form, address: value })} /></Field></div><div className="md:col-span-2"><button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save job</button></div></form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>{children}</label>; }
function Input({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <input value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-900">{value}</p></div>; }
function Alert({ tone, children, onClose }: { tone: "error" | "success"; children: React.ReactNode; onClose: () => void }) { return <div className={`mt-6 flex items-start justify-between gap-4 rounded-xl border p-4 text-sm font-semibold ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}><span>{children}</span><button type="button" onClick={onClose} className="rounded px-2 text-lg leading-none hover:bg-white/70">×</button></div>; }
function splitNotes(value?: string | null) { return (value ?? "").split(/\n+/).map(note => note.trim()).filter(Boolean); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString("en-GB"); }
function toDateTimeLocalValue(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; const pad = (number: number) => String(number).padStart(2, "0"); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
