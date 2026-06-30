import { useState } from "react";
import type { CustomerStaffMember, CustomerTeam } from "../../services/customerStaffService";
import type { JobAssignment } from "../../services/jobAssignmentsService";
import type { Job } from "../../types/job";
import JobCardAssignmentControls from "./JobCardAssignmentControls";

type JobCardProps = {
  job: Job;
  onViewJob?: (job: Job) => void;
  onDeleteJob?: (id: number) => void;
  onEditJob?: (job: Job) => void;
  teams?: CustomerTeam[];
  members?: CustomerStaffMember[];
  assignment?: JobAssignment;
  onUpdateAssignment?: (job: Job, patch: Partial<JobAssignment>) => void;
};

function JobCard({
  job,
  onViewJob,
  onDeleteJob,
  onEditJob,
  teams = [],
  members = [],
  assignment,
  onUpdateAssignment,
}: JobCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const selectedTeam = teams.find(team => team.id === assignment?.assignedTeamId);
  const leadMember = members.find(member => member.id === assignment?.leadStaffMemberId);

  function handleDelete() {
    if (!onDeleteJob) return;

    onDeleteJob(job.id);
    setShowConfirm(false);
  }

  function openJob() {
    onViewJob?.(job);
  }

  return (
    <>
      <article
        role={onViewJob ? "button" : undefined}
        tabIndex={onViewJob ? 0 : undefined}
        onClick={openJob}
        onKeyDown={event => {
          if (!onViewJob) return;

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openJob();
          }
        }}
        className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md ${
          onViewJob ? "cursor-pointer" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Job #{job.id}
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-900">
              {job.jobTitle}
            </h3>

            <p className="mt-1 text-sm font-medium text-slate-600">
              {job.customer}
            </p>
          </div>

          <span className={getPriorityClass(job.priority)}>{job.priority}</span>
        </div>

        <dl className="mt-4 grid gap-3 text-sm text-slate-600">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Status
            </dt>
            <dd className="mt-1 font-medium text-slate-900">
              {formatStatus(job.status)}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Phone
            </dt>
            <dd className="mt-1">{job.phone}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Address
            </dt>
            <dd className="mt-1">{job.address || "No address"}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Scheduled
            </dt>
            <dd className="mt-1">{formatDateTime(job.scheduledDate)}</dd>
          </div>

          {job.quoteId && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Linked quote
              </dt>
              <dd className="mt-1 font-semibold text-blue-700">
                Quote #{job.quoteId}
              </dd>
            </div>
          )}

          {selectedTeam && <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Team</dt><dd className="mt-1 font-semibold text-slate-900">{selectedTeam.name}</dd></div>}
          {leadMember && <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lead</dt><dd className="mt-1 font-semibold text-slate-900">{leadMember.firstName} {leadMember.lastName}</dd></div>}
        </dl>

        {job.notes && (
          <p className="mt-4 line-clamp-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {job.notes}
          </p>
        )}

        <JobCardAssignmentControls job={job} teams={teams} members={members} assignment={assignment} onUpdateAssignment={onUpdateAssignment} />

        <div
          className="mt-5 flex flex-wrap gap-2"
          onClick={event => event.stopPropagation()}
        >
          {onEditJob && (
            <button
              type="button"
              onClick={() => onEditJob(job)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
          )}

          {onDeleteJob && (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="rounded-md border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </article>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Delete Job</h2>

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
