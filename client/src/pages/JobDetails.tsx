import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import JobDetailsAssignmentPanel from "../components/jobs/JobDetailsAssignmentPanel";
import type { Job } from "../types/job";
import { jobsService } from "../services/jobsService";

export default function JobDetails() {
  const { id } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const jobId = Number(id);
    if (!Number.isFinite(jobId)) {
      setError("Invalid job ID.");
      return;
    }
    jobsService.getById(jobId).then(setJob).catch(() => setError("Unable to load job."));
  }, [id]);

  return <div className="min-h-screen bg-slate-50"><Sidebar /><main className="md:pl-64"><section className="mx-auto max-w-7xl px-6 py-8"><Link to="/jobs" className="text-sm font-medium text-blue-700 hover:text-blue-900">← Back to Jobs</Link>{error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}{!job && !error && <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading job...</div>}{job && <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]"><section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Job #{job.id}</p><h1 className="mt-1 text-3xl font-bold text-slate-900">{job.jobTitle}</h1><p className="mt-2 text-sm text-slate-600">{job.customer} · {formatDate(job.scheduledDate)}</p><div className="mt-6 grid gap-4 md:grid-cols-2"><Info label="Status" value={job.status === "InProgress" ? "In Progress" : job.status} /><Info label="Priority" value={job.priority} /><Info label="Phone" value={job.phone} /><Info label="Address" value={job.address || "No address"} /><Info label="Linked quote" value={job.quoteId ? `Quote #${job.quoteId}` : "No linked quote"} /><Info label="Notes" value={job.notes || "No notes"} /></div></section><aside className="space-y-6"><JobDetailsAssignmentPanel job={job} /><section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Quick actions</h2><div className="mt-4 flex flex-wrap gap-2"><Link to="/jobs" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to jobs</Link>{job.quoteId && <Link to={`/quotes/${job.quoteId}`} className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Open quote</Link>}</div></section></aside></div>}</section></main></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-900">{value}</p></div>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString("en-GB");
}
