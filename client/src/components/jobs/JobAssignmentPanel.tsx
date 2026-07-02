import { useEffect, useMemo, useState } from "react";
import { customerStaffService } from "../../services/customerStaffService";
import type { CustomerStaffMember, CustomerTeam } from "../../services/customerStaffService";
import { jobAssignmentsService } from "../../services/jobAssignmentsService";
import type { JobAssignment } from "../../services/jobAssignmentsService";
import type { Job } from "../../types/job";

export default function JobAssignmentPanel({ jobs }: { jobs: Job[] }) {
  const [members, setMembers] = useState<CustomerStaffMember[]>([]);
  const [teams, setTeams] = useState<CustomerTeam[]>([]);
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [savingJobId, setSavingJobId] = useState<number | null>(null);
  const [filter, setFilter] = useState("unassigned");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [workspace, assignmentRows] = await Promise.all([
      customerStaffService.getWorkspace(),
      jobAssignmentsService.getAll(),
    ]);
    setMembers(workspace.members.filter(member => member.status !== "Left"));
    setTeams(workspace.teams);
    setAssignments(assignmentRows);
  }

  const assignmentMap = useMemo(() => new Map(assignments.map(item => [item.jobId, item])), [assignments]);

  const visibleJobs = useMemo(() => {
    if (filter === "all") return jobs;
    if (filter === "unassigned") return jobs.filter(job => {
      const assignment = assignmentMap.get(job.id);
      return !assignment || (assignment.assignedStaffMemberIds.length === 0 && !assignment.assignedTeamId);
    });
    const staffId = Number(filter.replace("staff:", ""));
    return jobs.filter(job => assignmentMap.get(job.id)?.assignedStaffMemberIds.includes(staffId));
  }, [assignmentMap, filter, jobs]);

  async function update(job: Job, patch: Partial<JobAssignment>) {
    const current = assignmentMap.get(job.id) ?? {
      jobId: job.id,
      assignedTeamId: null,
      leadStaffMemberId: null,
      assignedStaffMemberIds: [],
      scheduledEndDate: null,
      calendarColour: "blue",
    };
      setSavingJobId(job.id);
    try {
      const updated = await jobAssignmentsService.update(job.id, {
        assignedTeamId: valueOrCurrent(patch, "assignedTeamId", current.assignedTeamId ?? null),
        leadStaffMemberId: valueOrCurrent(patch, "leadStaffMemberId", current.leadStaffMemberId ?? null),
        assignedStaffMemberIds: valueOrCurrent(patch, "assignedStaffMemberIds", current.assignedStaffMemberIds),
        scheduledEndDate: valueOrCurrent(patch, "scheduledEndDate", current.scheduledEndDate ?? null),
        calendarColour: valueOrCurrent(patch, "calendarColour", current.calendarColour ?? "blue"),
      });
      setAssignments(updated);
    } finally {
      setSavingJobId(null);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Job assignments</h2>
          <p className="mt-1 text-sm text-slate-600">Assign jobs to customer-company teams, engineers, staff, and a lead engineer. Assigned jobs feed the calendar filters.</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Showing {visibleJobs.length} job{visibleJobs.length === 1 ? "" : "s"}</p>
        </div>
        <select value={filter} onChange={event => setFilter(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="unassigned">Unassigned jobs</option>
          <option value="all">All jobs</option>
          {members.map(member => <option key={member.id} value={`staff:${member.id}`}>{member.firstName} {member.lastName}</option>)}
        </select>
      </div>

      <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-2">
        {visibleJobs.map(job => {
          const assignment = assignmentMap.get(job.id);
          const selectedStaff = assignment?.assignedStaffMemberIds ?? [];
          return <div key={job.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]"><div><p className="font-bold text-slate-900">#{job.id} {job.jobTitle}</p><p className="text-sm text-slate-600">{job.customer} · {new Date(job.scheduledDate).toLocaleString("en-GB")}</p></div><select value={assignment?.assignedTeamId ?? ""} onChange={event => update(job, { assignedTeamId: event.target.value ? Number(event.target.value) : null })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">No team</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select value={assignment?.leadStaffMemberId ?? ""} onChange={event => update(job, { leadStaffMemberId: event.target.value ? Number(event.target.value) : null })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Unassigned</option>{members.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}</select></div><div className="mt-3 flex flex-wrap gap-2">{members.map(member => <button key={member.id} type="button" onClick={() => update(job, { assignedStaffMemberIds: selectedStaff.includes(member.id) ? selectedStaff.filter(id => id !== member.id) : [...selectedStaff, member.id] })} className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedStaff.includes(member.id) ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{member.firstName} {member.lastName}</button>)}</div>{savingJobId === job.id && <p className="mt-2 text-xs text-slate-500">Saving assignment...</p>}</div>;
        })}
        {visibleJobs.length === 0 && <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No jobs match this assignment filter.</p>}
      </div>
    </section>
  );
}

function valueOrCurrent<TKey extends keyof JobAssignment>(
  patch: Partial<JobAssignment>,
  key: TKey,
  currentValue: JobAssignment[TKey],
) {
  return Object.prototype.hasOwnProperty.call(patch, key) ? patch[key] as JobAssignment[TKey] : currentValue;
}
