import type { CustomerStaffMember, CustomerTeam } from "../../services/customerStaffService";
import type { JobAssignment } from "../../services/jobAssignmentsService";
import type { Job } from "../../types/job";

type Props = {
  job: Job;
  teams: CustomerTeam[];
  members: CustomerStaffMember[];
  assignment?: JobAssignment;
  onUpdateAssignment?: (job: Job, patch: Partial<JobAssignment>) => void;
};

export default function JobCardAssignmentControls({ job, teams, members, assignment, onUpdateAssignment }: Props) {
  if (!onUpdateAssignment || (teams.length === 0 && members.length === 0)) return null;

  const selectedStaffIds = assignment?.assignedStaffMemberIds ?? [];

  function toggleStaff(memberId: number) {
    onUpdateAssignment?.(job, {
      assignedStaffMemberIds: selectedStaffIds.includes(memberId)
        ? selectedStaffIds.filter(id => id !== memberId)
        : [...selectedStaffIds, memberId],
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3" onClick={event => event.stopPropagation()}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Assign staff/team</p>
      <div className="mt-3 grid gap-2">
        <select value={assignment?.assignedTeamId ?? ""} onChange={event => onUpdateAssignment(job, { assignedTeamId: event.target.value ? Number(event.target.value) : null })} className="rounded-lg border border-slate-300 px-2 py-2 text-xs">
          <option value="">No team</option>
          {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
        <select value={assignment?.leadStaffMemberId ?? ""} onChange={event => onUpdateAssignment(job, { leadStaffMemberId: event.target.value ? Number(event.target.value) : null })} className="rounded-lg border border-slate-300 px-2 py-2 text-xs">
          <option value="">No lead engineer</option>
          {members.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}
        </select>
        <div className="flex flex-wrap gap-1.5">
          {members.map(member => (
            <button key={member.id} type="button" onClick={() => toggleStaff(member.id)} className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${selectedStaffIds.includes(member.id) ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
              {member.firstName}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
