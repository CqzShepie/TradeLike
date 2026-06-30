import type { CustomerStaffMember, CustomerTeam } from "../../services/customerStaffService";
import type { JobAssignment } from "../../services/jobAssignmentsService";
import type { Job } from "../../types/job";

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

function JobCard({ job, onViewJob, teams = [], members = [], assignment }: JobCardProps) {
  const selectedTeam = teams.find(team => team.id === assignment?.assignedTeamId);
  const leadMember = members.find(member => member.id === assignment?.leadStaffMemberId);

  function openJob() {
    onViewJob?.(job);
  }

  return (
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
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md ${onViewJob ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Job #{job.id}</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{job.jobTitle}</h3>
          <p className="mt-1 text-sm font-medium text-slate-600">{job.customer}</p>
        </div>
        <span className={getPriorityClass(job.priority)}>{job.priority}</span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm text-slate-600">
        <Info label="Scheduled" value={formatDateTime(job.scheduledDate)} strong />
        {job.quoteId && <Info label="Linked quote" value={`Quote #${job.quoteId}`} />}
        {selectedTeam && <Info label="Team" value={selectedTeam.name} />}
        {leadMember && <Info label="Lead engineer" value={`${leadMember.firstName} ${leadMember.lastName}`} />}
      </dl>

      {job.notes && <p className="mt-4 line-clamp-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{job.notes}</p>}
    </article>
  );
}

function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className={`mt-1 ${strong ? "font-medium text-slate-900" : ""}`}>{value}</dd></div>;
}

function formatDateTime(value: string) {
  if (!value) return "No date set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getPriorityClass(priority: Job["priority"]) {
  const base = "rounded-full px-2 py-1 text-xs font-semibold";
  switch (priority) {
    case "Urgent": return `${base} bg-red-100 text-red-700`;
    case "High": return `${base} bg-orange-100 text-orange-700`;
    case "Low": return `${base} bg-slate-100 text-slate-600`;
    default: return `${base} bg-blue-100 text-blue-700`;
  }
}

export default JobCard;
