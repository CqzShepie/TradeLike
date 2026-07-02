import type { CustomerStaffMember, CustomerTeam } from "../../services/customerStaffService";
import type { JobAssignment } from "../../services/jobAssignmentsService";
import type { Job } from "../../types/job";
import { getTeamColourLabel } from "../../utils/teamColours";

type Props = {
  job: Job;
  teams: CustomerTeam[];
  members: CustomerStaffMember[];
  assignment?: JobAssignment;
  onUpdateAssignment?: (job: Job, patch: Partial<JobAssignment>) => void;
};

export default function JobCardAssignmentControls({ job, teams, members, assignment, onUpdateAssignment }: Props) {
  if (!onUpdateAssignment || (teams.length === 0 && members.length === 0)) return null;

  const leadStaffMemberId = assignment?.leadStaffMemberId ?? null;
  const selectedStaffIds = (assignment?.assignedStaffMemberIds ?? []).filter(id => id !== leadStaffMemberId);
  const extraMembers = members.filter(member => member.id !== leadStaffMemberId);

  function updateTeam(teamId: number | null) {
    const selectedTeam = teamId ? teams.find(team => team.id === teamId) : undefined;
    onUpdateAssignment?.(job, {
      assignedTeamId: teamId,
      calendarColour: selectedTeam?.colour ?? "blue",
    });
  }

  function toggleStaff(memberId: number) {
    onUpdateAssignment?.(job, {
      assignedStaffMemberIds: selectedStaffIds.includes(memberId)
        ? selectedStaffIds.filter(id => id !== memberId)
        : [...selectedStaffIds, memberId],
    });
  }

  function updateLead(memberId: number | null) {
    onUpdateAssignment?.(job, {
      leadStaffMemberId: memberId,
      assignedStaffMemberIds: selectedStaffIds.filter(id => id !== memberId),
    });
  }

  function clearAssignment() {
    onUpdateAssignment?.(job, {
      assignedTeamId: null,
      leadStaffMemberId: null,
      assignedStaffMemberIds: [],
      calendarColour: "blue",
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/70 p-3" onClick={event => event.stopPropagation()}>
      <p className="text-xs font-bold uppercase tracking-wide text-blue-300">Assign staff/team</p>
      <div className="mt-3 grid gap-2">
        <select value={assignment?.assignedTeamId ?? ""} onChange={event => updateTeam(event.target.value ? Number(event.target.value) : null)} className="rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-xs text-white">
          <option value="">No team</option>
          {teams.map(team => <option key={team.id} value={team.id}>{team.name} - {getTeamColourLabel(team.colour)}</option>)}
        </select>
        <select value={leadStaffMemberId ?? ""} onChange={event => updateLead(event.target.value ? Number(event.target.value) : null)} className="rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-xs text-white">
          <option value="">No lead engineer</option>
          {members.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}
        </select>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Extra staff</p>
          <div className="flex flex-wrap gap-1.5">
            {extraMembers.map(member => (
              <button key={member.id} type="button" onClick={() => toggleStaff(member.id)} className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${selectedStaffIds.includes(member.id) ? "border-blue-500 bg-blue-600 text-white" : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"}`}>
                {member.firstName}
              </button>
            ))}
            {extraMembers.length === 0 && <span className="text-[11px] text-slate-500">No extra staff available.</span>}
          </div>
        </div>
        <button type="button" onClick={clearAssignment} className="rounded-lg border border-white/10 px-2 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10">
          Unassign
        </button>
      </div>
    </div>
  );
}
