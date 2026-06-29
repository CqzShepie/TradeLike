import { useState } from "react";

import Card from "../ui/Card";
import Modal from "../ui/Modal";
import StatusBadge from "../ui/StatusBadge";
import PriorityBadge from "../ui/PriorityBadge";

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

  // ✅ FORMAT DATE PROPERLY FOR UI
  const formattedDate = job.scheduledDate
    ? new Date(job.scheduledDate).toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No date set";

  return (
    <>
      <Card
        className="cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md"
        onClick={() => onViewJob?.(job)}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {job.jobTitle}
            </h3>

            <p className="mt-1 text-slate-600">
              👤 {job.customer}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              📍 {job.address || "No address"}
            </p>

            {/* ✅ FIXED CALENDAR DISPLAY */}
            <p className="mt-3 text-sm font-medium text-slate-500">
              🕒 {formattedDate}
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <PriorityBadge priority={job.priority} />

            <StatusBadge status={job.status} />

            <div className="mt-2 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditJob?.(job);
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Edit
              </button>

              {onDeleteJob && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirm(true);
                  }}
                  className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {showConfirm && (
        <Modal
          title="Confirm Delete"
          onClose={() => setShowConfirm(false)}
        >
          <p className="mb-6 text-slate-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold">
              {job.jobTitle}
            </span>
            ?
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
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default JobCard;