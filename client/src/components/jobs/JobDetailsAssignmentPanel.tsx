import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../hooks/useAuth";
import { canUseStaffScheduling } from "../../routes/planEntitlements";
import { customerStaffService } from "../../services/customerStaffService";
import type { CustomerStaffMember, CustomerTeam } from "../../services/customerStaffService";
import { jobAssignmentsService } from "../../services/jobAssignmentsService";
import type { JobAssignment } from "../../services/jobAssignmentsService";
import type { Job } from "../../types/job";

type Props = {
  job: Job;
};

export default function JobDetailsAssignmentPanel({ job }: Props) {
  const [members, setMembers] = useState<CustomerStaffMember[]>([]);
  const [teams, setTeams] = useState<CustomerTeam[]>([]);
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const showStaffScheduling = canUseStaffScheduling(user);

  useEffect(() => {
    if (!showStaffScheduling) {
      setMembers([]);
      setTeams([]);
      setAssignments([]);
      return;
    }

    let cancelled = false;

    async function load() {
      const [workspace, rows] = await Promise.all([
        customerStaffService.getWorkspace(),
        jobAssignmentsService.getAll(),
      ]);

      if (cancelled) {
        return;
      }

      setMembers(workspace.members.filter(member => member.status === "Active"));
      setTeams(workspace.teams);
      setAssignments(rows);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [showStaffScheduling]);

  const assignment = useMemo(() => assignments.find(item => item.jobId === job.id), [assignments, job.id]);
  const leadStaffMemberId = assignment?.leadStaffMemberId ?? null;
  const leadMember = members.find(member => member.id === leadStaffMemberId);
  const selectedStaffIds = (assignment?.assignedStaffMemberIds ?? []).filter(id => id !== leadStaffMemberId);
  const staffOptions = members.filter(member => member.id !== leadStaffMemberId);

  async function update(patch: Partial<JobAssignment>) {
    const current = assignment ?? {
      jobId: job.id,
      assignedTeamId: null,
      leadStaffMemberId: null,
      assignedStaffMemberIds: [],
      scheduledEndDate: null,
      calendarColour: "blue",
    };
    setSaving(true);

    try {
      const nextTeamId = patch.assignedTeamId ?? current.assignedTeamId ?? null;
      const selectedTeam = nextTeamId ? teams.find(team => team.id === nextTeamId) : undefined;
      setAssignments(await jobAssignmentsService.update(job.id, {
        assignedTeamId: nextTeamId,
        leadStaffMemberId: patch.leadStaffMemberId ?? current.leadStaffMemberId ?? null,
        assignedStaffMemberIds: patch.assignedStaffMemberIds ?? current.assignedStaffMemberIds,
        scheduledEndDate: patch.scheduledEndDate ?? current.scheduledEndDate ?? null,
        calendarColour: patch.calendarColour ?? selectedTeam?.colour ?? current.calendarColour ?? "blue",
      }));
    } finally {
      setSaving(false);
    }
  }

  function updateLead(memberId: number | null) {
    update({
      leadStaffMemberId: memberId,
      assignedStaffMemberIds: selectedStaffIds.filter(id => id !== memberId),
    });
  }

  function toggleStaff(memberId: number) {
    update({
      assignedStaffMemberIds: selectedStaffIds.includes(memberId)
        ? selectedStaffIds.filter(id => id !== memberId)
        : [...selectedStaffIds, memberId],
    });
  }

  function clearAssignment() {
    update({
      assignedTeamId: null,
      leadStaffMemberId: null,
      assignedStaffMemberIds: [],
      calendarColour: "blue",
    });
  }

  if (!showStaffScheduling) {
    return null;
  }

  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/60 p-6 shadow-sm shadow-slate-950/20">
      <h2 className="text-lg font-bold text-white">Staff and Team</h2>
      <p className="mt-1 text-sm text-slate-400">
        Assign a team, one lead engineer, and several extra staff members.
      </p>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
        <p className="font-semibold text-slate-100">Current assignment</p>
        <p className="mt-1">
          {leadStaffMemberId
            ? leadMember
              ? `${leadMember.firstName} ${leadMember.lastName}`
              : "Lead engineer selected"
            : selectedStaffIds.length
              ? `${selectedStaffIds.length} staff assigned`
              : "Unassigned"}
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        <select
          value={assignment?.assignedTeamId ?? ""}
          onChange={event => update({ assignedTeamId: event.target.value ? Number(event.target.value) : null })}
          className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">No team</option>
          {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>

        <select
          value={leadStaffMemberId ?? ""}
          onChange={event => updateLead(event.target.value ? Number(event.target.value) : null)}
          className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">No lead engineer</option>
          {members.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}
        </select>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Extra staff</p>
          <div className="flex flex-wrap gap-2">
            {staffOptions.map(member => (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleStaff(member.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedStaffIds.includes(member.id)
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"}`}
              >
                {member.firstName} {member.lastName}
              </button>
            ))}
            {staffOptions.length === 0 && <span className="text-sm text-slate-500">No extra staff available.</span>}
          </div>
        </div>

        {saving && <p className="text-xs text-slate-500">Saving...</p>}

        <button
          type="button"
          onClick={clearAssignment}
          disabled={saving || (!assignment?.assignedTeamId && !assignment?.leadStaffMemberId && (assignment?.assignedStaffMemberIds.length ?? 0) === 0)}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Unassign job
        </button>
      </div>
    </section>
  );
}
