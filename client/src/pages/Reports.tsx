import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import { customerStaffService } from "../services/customerStaffService";
import { jobAssignmentsService } from "../services/jobAssignmentsService";
import type { JobAssignment } from "../services/jobAssignmentsService";
import { jobsService } from "../services/jobsService";
import type { CustomerStaffMember, CustomerStaffWorkspace, CustomerTeam } from "../services/customerStaffService";
import type { Job } from "../types/job";

const blankWorkspace: CustomerStaffWorkspace = {
  teams: [],
  members: [],
  entitlements: { planName: "Solo", maxUsers: 1, teamsEnabled: false, staffSchedulingEnabled: false, advancedPermissionsEnabled: false, reportingEnabled: false, apiAccessEnabled: false, supportLevel: "Email" },
  roleOptions: [],
  futureSecurityItems: [],
  qualityOfLifeItems: [],
};

export default function Reports() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [workspace, setWorkspace] = useState<CustomerStaffWorkspace>(blankWorkspace);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const [jobRows, assignmentRows, staffWorkspace] = await Promise.all([
        jobsService.getAll(),
        jobAssignmentsService.getAll(),
        customerStaffService.getWorkspace(),
      ]);
      setJobs(jobRows);
      setAssignments(assignmentRows);
      setWorkspace(staffWorkspace);
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, []);

  const assignmentMap = useMemo(() => new Map(assignments.map(item => [item.jobId, item])), [assignments]);

  const filteredJobs = useMemo(() => jobs.filter(job => {
    const assignment = assignmentMap.get(job.id);
    if (teamFilter !== "all" && assignment?.assignedTeamId !== Number(teamFilter)) return false;
    if (staffFilter !== "all") {
      const id = Number(staffFilter);
      if (!assignment?.assignedStaffMemberIds.includes(id) && assignment?.leadStaffMemberId !== id) return false;
    }
    return true;
  }), [assignmentMap, jobs, staffFilter, teamFilter]);

  const completed = filteredJobs.filter(job => job.status === "Completed").length;
  const cancelled = filteredJobs.filter(job => job.status === "Cancelled").length;
  const scheduled = filteredJobs.filter(job => job.status === "Scheduled").length;
  const inProgress = filteredJobs.filter(job => job.status === "InProgress").length;
  const unassigned = filteredJobs.filter(job => {
    const assignment = assignmentMap.get(job.id);
    return !assignment || (!assignment.assignedTeamId && !assignment.leadStaffMemberId && assignment.assignedStaffMemberIds.length === 0);
  }).length;

  const staffWorkload = useMemo(() => workspace.members.map(member => ({
    member,
    count: filteredJobs.filter(job => {
      const assignment = assignmentMap.get(job.id);
      return assignment?.leadStaffMemberId === member.id || assignment?.assignedStaffMemberIds.includes(member.id);
    }).length,
  })).sort((a, b) => b.count - a.count), [assignmentMap, filteredJobs, workspace.members]);

  const teamWorkload = useMemo(() => workspace.teams.map(team => ({
    team,
    count: filteredJobs.filter(job => assignmentMap.get(job.id)?.assignedTeamId === team.id).length,
  })).sort((a, b) => b.count - a.count), [assignmentMap, filteredJobs, workspace.teams]);

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <section className="min-w-0 flex-1 p-10">
        <div className="max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Reporting</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">Reports</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Track job volume, completed work, cancelled work, unassigned jobs, team workload and staff workload. Advanced exports are gated by plan.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <p className="font-bold text-slate-900">{workspace.entitlements.planName}</p>
              <p className="text-slate-600">Reporting: {workspace.entitlements.reportingEnabled ? "Included" : "Upgrade"}</p>
              <p className="text-slate-600">API: {workspace.entitlements.apiAccessEnabled ? "Included" : "Upgrade"}</p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <select value={teamFilter} onChange={event => setTeamFilter(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All teams</option>{workspace.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
              <select value={staffFilter} onChange={event => setStaffFilter(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All staff</option>{workspace.members.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}</select>
            </div>
          </div>

          {loading ? <p className="mt-8 text-sm text-slate-500">Loading reports...</p> : <>
            <div className="mt-6 grid gap-4 md:grid-cols-5">
              <Stat label="Total jobs" value={filteredJobs.length} />
              <Stat label="Scheduled" value={scheduled} />
              <Stat label="In progress" value={inProgress} />
              <Stat label="Completed" value={completed} />
              <Stat label="Cancelled" value={cancelled} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Stat label="Unassigned jobs" value={unassigned} />
              <Stat label="Team count" value={workspace.teams.length} />
              <Stat label="Staff count" value={workspace.members.length} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <Panel title="Staff workload">{staffWorkload.map(item => <WorkloadRow key={item.member.id} label={`${item.member.firstName} ${item.member.lastName}`} value={item.count} member={item.member} />)}{staffWorkload.length === 0 && <p className="text-sm text-slate-500">No staff yet.</p>}</Panel>
              <Panel title="Team workload">{teamWorkload.map(item => <WorkloadRow key={item.team.id} label={item.team.name} value={item.count} team={item.team} />)}{teamWorkload.length === 0 && <p className="text-sm text-slate-500">No teams yet.</p>}</Panel>
            </div>

            {!workspace.entitlements.reportingEnabled && <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Advanced reporting unlocks on Team, Business and Enterprise plans.</div>}
          </>}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">{title}</h2><div className="mt-4 space-y-3">{children}</div></section>;
}

function WorkloadRow({ label, value, member, team }: { label: string; value: number; member?: CustomerStaffMember; team?: CustomerTeam }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-4"><div><p className="font-semibold text-slate-900">{label}</p><p className="text-xs text-slate-500">{member?.roleName ?? team?.serviceArea ?? "Team"}</p></div><p className="text-2xl font-bold text-blue-600">{value}</p></div></div>;
}
