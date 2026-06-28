import { useState } from "react";
import type { Job } from "../../types/job";
import StatusBadge from "../ui/StatusBadge";
import Modal from "../ui/Modal";

type JobCardProps = {
  job: Job;
  onDeleteJob?: (id: number) => void;
  onEditJob?: (job: Job) => void;
};

function JobCard({ job, onDeleteJob, onEditJob }: JobCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    if (!onDeleteJob) return;

    onDeleteJob(job.id);
    setShowConfirm(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between">
        {/* LEFT SIDE */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {job.jobTitle}
          </h3>

          <p className="mt-1 text-slate-600">👤 {job.customer}</p>

          <p className="mt-1 text-sm text-slate-500">
            📍 {job.address || "No address"}
          </p>

          <p className="mt-3 text-sm font-medium text-slate-500">
            🕒 {job.time}
          </p>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex flex-col items-end gap-4">
          <StatusBadge status={job.status} />

          <div className="flex gap-2">
            <button
              onClick={() => onEditJob?.(job)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Edit
            </button>

            {onDeleteJob && (
              <button
                onClick={() => setShowConfirm(true)}
                className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {showConfirm && (
        <Modal
          title="Confirm Delete"
          onClose={() => setShowConfirm(false)}
        >
          <p className="mb-6 text-slate-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{job.jobTitle}</span>?
          </p>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Cancel
            </button>

            <button
              onClick={handleDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default JobCard;