import { useState } from "react";
import type { Job } from "../../types/job";

type JobCardProps = {
    job: Job;
    onViewJob?: (job: Job) => void;
    onDeleteJob?: (id: number) => void;
    onEditJob?: (job: Job) => void;
};

function JobCard({
    job,
    onViewJob,
    onDeleteJob,
    onEditJob,
}: JobCardProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    function handleDelete() {
        if (!onDeleteJob) return;

        onDeleteJob(job.id);
        setShowConfirm(false);
    }

    return (
        <>
            <article
                onClick={() => onViewJob?.(job)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            Job #{job.id}
                        </p>

                        <h3 className="mt-1 text-lg font-bold text-slate-900">
                            {job.jobTitle}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                            {job.customer}
                        </p>
                    </div>

                    <span className={getPriorityClass(job.priority)}>
                        {job.priority}
                    </span>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                    <p>
                        <span className="font-medium text-slate-800">Status:</span>{" "}
                        {formatStatus(job.status)}
                    </p>

                    <p>
                        <span className="font-medium text-slate-800">Phone:</span>{" "}
                        {job.phone}
                    </p>

                    <p>
                        <span className="font-medium text-slate-800">Address:</span>{" "}
                        {job.address || "No address"}
                    </p>

                    <p>
                        <span className="font-medium text-slate-800">Scheduled:</span>{" "}
                        {formatDateTime(job.scheduledDate)}
                    </p>
                </div>

                {job.notes && (
                    <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                        {job.notes}
                    </div>
                )}

                <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                        type="button"
                        onClick={event => {
                            event.stopPropagation();
                            onEditJob?.(job);
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Edit
                    </button>

                    {onDeleteJob && (
                        <button
                            type="button"
                            onClick={event => {
                                event.stopPropagation();
                                setShowConfirm(true);
                            }}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </article>

            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-bold text-slate-900">
                            Delete Job
                        </h2>

                        <p className="mt-2 text-sm text-slate-600">
                            Are you sure you want to delete{" "}
                            <span className="font-semibold">{job.jobTitle}</span>?
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirm(false)}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleDelete}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
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

function getPriorityClass(priority: Job["priority"]) {
    const base = "rounded-full px-2 py-1 text-xs font-semibold";

    switch (priority) {
        case "Urgent":
            return `${base} bg-red-100 text-red-700`;
        case "High":
            return `${base} bg-orange-100 text-orange-700`;
        case "Low":
            return `${base} bg-slate-100 text-slate-600`;
        default:
            return `${base} bg-blue-100 text-blue-700`;
    }
}

export default JobCard;