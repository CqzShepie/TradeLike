import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import type { Job } from "../types/job";
import { jobsService } from "../services/jobsService";

export default function JobDetails() {
    const { id } = useParams();
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadJob() {
            const jobId = Number(id);

            if (!Number.isFinite(jobId)) {
                setError("Invalid job ID.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const data = await jobsService.getById(jobId);

                setJob(data);
            } catch {
                setError("Unable to load job.");
            } finally {
                setLoading(false);
            }
        }

        loadJob();
    }, [id]);

    return (
        <main className="flex min-h-screen bg-slate-50">
            <Sidebar />

            <section className="flex-1 p-10">
                <div className="mb-6">
                    <Link
                        to="/jobs"
                        className="text-sm font-medium text-blue-600 hover:underline"
                    >
                        ← Back to Jobs
                    </Link>
                </div>

                {loading && (
                    <p className="text-slate-500">
                        Loading job...
                    </p>
                )}

                {!loading && error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                        <p className="font-medium text-red-700">
                            {error}
                        </p>
                    </div>
                )}

                {!loading && !error && job && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900">
                                    {job.jobTitle}
                                </h1>

                                <p className="mt-2 text-slate-600">
                                    {job.customer}
                                </p>
                            </div>

                            <div className="text-right">
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                    {formatStatus(job.status)}
                                </span>

                                <p className="mt-2 text-xs text-slate-500">
                                    {job.priority}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 grid gap-6 md:grid-cols-2">
                            <Detail label="Phone" value={job.phone} />
                            <Detail label="Scheduled" value={formatDateTime(job.scheduledDate)} />
                            <Detail label="Address" value={job.address} />
                            <Detail
                                label="Engineer"
                                value={job.engineerId == null
                                    ? "Unassigned"
                                    : `Engineer ${job.engineerId}`}
                            />
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}

function Detail({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-sm font-medium text-slate-900">
                {value}
            </p>
        </div>
    );
}

function formatDateTime(value: string) {
    return new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatStatus(value: string) {
    if (value === "InProgress") {
        return "In Progress";
    }

    return value;
}