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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
    setMessage("");
    setError("");

    try {
      const nextTeamId = valueOrCurrent(patch, "assignedTeamId", current.assignedTeamId ?? null);
      const selectedTeam = nextTeamId ? teams.find(team => team.id === nextTeamId) : undefined;
      setAssignments(await jobAssignmentsService.update(job.id, {
        assignedTeamId: nextTeamId,
        leadStaffMemberId: valueOrCurrent(patch, "leadStaffMemberId", current.leadStaffMemberId ?? null),
        assignedStaffMemberIds: valueOrCurrent(patch, "assignedStaffMemberIds", current.assignedStaffMemberIds),
        scheduledEndDate: valueOrCurrent(patch, "scheduledEndDate", current.scheduledEndDate ?? null),
        calendarColour: valueOrCurrent(patch, "calendarColour", selectedTeam?.colour ?? current.calendarColour ?? "blue"),
      }));
      setMessage("Assignment updated.");
    } catch {
      setError("Assignment could not be updated.");
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

  async function clearAssignment() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      setAssignments(await jobAssignmentsService.clear(job.id));
      setMessage("Assignment cleared.");
    } catch {
      setError("Assignment could not be cleared.");
    } finally {
      setSaving(false);
    }
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

      <div className="mt-4 grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300 sm:grid-cols-2">
        <AssignmentSummary label="Current assignment" value={leadMember ? getMemberName(leadMember) : selectedStaffIds.length ? `${selectedStaffIds.length} staff assigned` : "Unassigned"} />
        <AssignmentSummary label="Team" value={teams.find(team => team.id === assignment?.assignedTeamId)?.name ?? "No team"} />
        <AssignmentSummary label="Lead" value={leadMember ? getMemberName(leadMember) : "Unassigned"} />
        <AssignmentSummary label="Extra staff" value={selectedStaffIds.length ? `${selectedStaffIds.length} selected` : "None"} />
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
          <option value="">Unassigned</option>
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
        {message && <p className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{message}</p>}
        {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}

        <button
          type="button"
          onClick={clearAssignment}
          disabled={saving || (!assignment?.assignedTeamId && !assignment?.leadStaffMemberId && (assignment?.assignedStaffMemberIds.length ?? 0) === 0)}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear assignment
        </button>
      </div>
    </section>
  );
}

function AssignmentSummary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function valueOrCurrent<TKey extends keyof JobAssignment>(
  patch: Partial<JobAssignment>,
  key: TKey,
  currentValue: JobAssignment[TKey],
) {
  return Object.prototype.hasOwnProperty.call(patch, key) ? patch[key] as JobAssignment[TKey] : currentValue;
}

function getMemberName(member: CustomerStaffMember) {
  return `${member.firstName} ${member.lastName}`.trim();
}
