import { useEffect, useMemo, useState } from "react";
import { customerStaffService } from "../../services/customerStaffService";
import type { CustomerStaffMember, CustomerTeam } from "../../services/customerStaffService";
import { jobAssignmentsService } from "../../services/jobAssignmentsService";
import type { JobAssignment } from "../../services/jobAssignmentsService";
import type { Job } from "../../types/job";

type Props = { job: Job };

export default function JobDetailsAssignmentPanel({ job }: Props) {
  const [members, setMembers] = useState<CustomerStaffMember[]>([]);
  const [teams, setTeams] = useState<CustomerTeam[]>([]);
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [workspace, rows] = await Promise.all([customerStaffService.getWorkspace(), jobAssignmentsService.getAll()]);
    setMembers(workspace.members.filter(member => member.status !== "Left"));
    setTeams(workspace.teams);
    setAssignments(rows);
  }

  const assignment = useMemo(() => assignments.find(item => item.jobId === job.id), [assignments, job.id]);
  const leadStaffMemberId = assignment?.leadStaffMemberId ?? null;
  const selectedStaffIds = (assignment?.assignedStaffMemberIds ?? []).filter(id => id !== leadStaffMemberId);
  const staffOptions = members.filter(member => member.id !== leadStaffMemberId);

  async function update(patch: Partial<JobAssignment>) {
    const current = assignment ?? { jobId: job.id, assignedTeamId: null, leadStaffMemberId: null, assignedStaffMemberIds: [], scheduledEndDate: null, calendarColour: "blue" };
    setSaving(true);
    try {
      const nextTeamId = patch.assignedTeamId ?? current.assignedTeamId ?? null;
      const selectedTeam = nextTeamId ? teams.find(team => team.id === nextTeamId) : undefined;
      setAssignments(await jobAssignmentsService.update(job.id, { assignedTeamId: nextTeamId, leadStaffMemberId: patch.leadStaffMemberId ?? current.leadStaffMemberId ?? null, assignedStaffMemberIds: patch.assignedStaffMemberIds ?? current.assignedStaffMemberIds, scheduledEndDate: patch.scheduledEndDate ?? current.scheduledEndDate ?? null, calendarColour: patch.calendarColour ?? selectedTeam?.colour ?? current.calendarColour ?? "blue" }));
    } finally {
      setSaving(false);
    }
  }

  function updateLead(memberId: number | null) { update({ leadStaffMemberId: memberId, assignedStaffMemberIds: selectedStaffIds.filter(id => id !== memberId) }); }
  function toggleStaff(memberId: number) { update({ assignedStaffMemberIds: selectedStaffIds.includes(memberId) ? selectedStaffIds.filter(id => id !== memberId) : [...selectedStaffIds, memberId] }); }

  return <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Staff and team</h2><div className="mt-4 grid gap-3"><select value={assignment?.assignedTeamId ?? ""} onChange={event => update({ assignedTeamId: event.target.value ? Number(event.target.value) : null })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">No team</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select value={leadStaffMemberId ?? ""} onChange={event => updateLead(event.target.value ? Number(event.target.value) : null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">No lead engineer</option>{members.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}</select><div className="flex flex-wrap gap-2">{staffOptions.map(member => <button key={member.id} type="button" onClick={() => toggleStaff(member.id)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedStaffIds.includes(member.id) ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{member.firstName}</button>)}</div>{saving && <p className="text-xs text-slate-500">Saving...</p>}</div></section>;
}
