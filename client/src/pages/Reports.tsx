import { useEffect, useMemo, useState } from "react";
import { BarChart3, Briefcase, CheckCircle2, Users } from "lucide-react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  ProductPage,
  ProductPageHeader,
  ProductPanel,
  ProductStat,
  SecondaryButton,
  SelectInput,
} from "../components/ui";
import { customerStaffService } from "../services/customerStaffService";
import { jobAssignmentsService } from "../services/jobAssignmentsService";
import type { JobAssignment } from "../services/jobAssignmentsService";
import { jobsService } from "../services/jobsService";
import { isApiError } from "../services/apiClient";
import type { CustomerStaffMember, CustomerStaffWorkspace, CustomerTeam } from "../services/customerStaffService";
import type { Job } from "../types/job";
import AccessDenied from "./AccessDenied";
import UpgradeRequired from "./UpgradeRequired";

const blankWorkspace: CustomerStaffWorkspace = {
  teams: [],
  members: [],
  entitlements: {
    planName: "Solo",
    maxUsers: 1,
    teamsEnabled: false,
    staffSchedulingEnabled: false,
    advancedPermissionsEnabled: false,
    reportingEnabled: false,
    apiAccessEnabled: false,
    supportLevel: "Email",
  },
  roleOptions: [],
  futureSecurityItems: [],
  qualityOfLifeItems: [],
};

export default function Reports() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [workspace, setWorkspace] = useState<CustomerStaffWorkspace>(blankWorkspace);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [teamFilter, setTeamFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");

  useEffect(() => {
    void loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      setError(null);
      const [jobRows, assignmentRows, staffWorkspace] = await Promise.all([
        jobsService.getAll(),
        jobAssignmentsService.getAll(),
        customerStaffService.getWorkspace(),
      ]);

      setJobs(jobRows);
      setAssignments(assignmentRows);
      setWorkspace(staffWorkspace);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Reports could not be loaded."));
    } finally {
      setLoading(false);
    }
  }

  const assignmentMap = useMemo(
    () => new Map(assignments.map(item => [item.jobId, item])),
    [assignments]
  );

  const filteredJobs = useMemo(
    () =>
      jobs.filter(job => {
        const assignment = assignmentMap.get(job.id);

        if (teamFilter !== "all" && assignment?.assignedTeamId !== Number(teamFilter)) {
          return false;
        }

        if (staffFilter !== "all") {
          const id = Number(staffFilter);

          if (!assignment?.assignedStaffMemberIds.includes(id) && assignment?.leadStaffMemberId !== id) {
            return false;
          }
        }

        return true;
      }),
    [assignmentMap, jobs, staffFilter, teamFilter]
  );

  const completed = filteredJobs.filter(job => job.status === "Completed").length;
  const cancelled = filteredJobs.filter(job => job.status === "Cancelled").length;
  const scheduled = filteredJobs.filter(job => job.status === "Scheduled").length;
  const inProgress = filteredJobs.filter(job => job.status === "InProgress").length;
  const unassigned = filteredJobs.filter(job => {
    const assignment = assignmentMap.get(job.id);
    return !assignment || (!assignment.assignedTeamId && !assignment.leadStaffMemberId && assignment.assignedStaffMemberIds.length === 0);
  }).length;

  const staffWorkload = useMemo(
    () =>
      workspace.members
        .map(member => ({
          member,
          count: filteredJobs.filter(job => {
            const assignment = assignmentMap.get(job.id);
            return assignment?.leadStaffMemberId === member.id || assignment?.assignedStaffMemberIds.includes(member.id);
          }).length,
        }))
        .sort((a, b) => b.count - a.count),
    [assignmentMap, filteredJobs, workspace.members]
  );

  const teamWorkload = useMemo(
    () =>
      workspace.teams
        .map(team => ({
          team,
          count: filteredJobs.filter(job => assignmentMap.get(job.id)?.assignedTeamId === team.id).length,
        }))
        .sort((a, b) => b.count - a.count),
    [assignmentMap, filteredJobs, workspace.teams]
  );

  if (isApiError(error) && error.status === 403) {
    return <AccessDenied />;
  }

  if (isApiError(error) && error.status === 402) {
    return <UpgradeRequired />;
  }

  return (
    <ProductPage>
      <ProductPageHeader
        eyebrow="Operations intelligence"
        title="Reports"
        description="Track job volume, completion, cancellations, unassigned work, and team workload from real job and assignment data."
        actions={
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
            <p className="font-bold text-white">{workspace.entitlements.planName}</p>
            <p className="text-slate-400">Reporting: {workspace.entitlements.reportingEnabled ? "Included" : "Upgrade"}</p>
          </div>
        }
      />

      {loading && <LoadingState title="Loading reports" description="Pulling together jobs, teams, and staff workload." />}

      {!loading && error && (
        <ErrorState
          title="Unable to load reports"
          description={error.message}
          action={
            <SecondaryButton type="button" onClick={() => void loadReports()} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
              Retry
            </SecondaryButton>
          }
        />
      )}

      {!loading && !error && (
        <>
          <ProductPanel>
            <div className="grid gap-3 md:grid-cols-2">
              <SelectInput value={teamFilter} onChange={event => setTeamFilter(event.target.value)} className="border-white/10 bg-slate-950/60 text-white">
                <option value="all">All teams</option>
                {workspace.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
              </SelectInput>
              <SelectInput value={staffFilter} onChange={event => setStaffFilter(event.target.value)} className="border-white/10 bg-slate-950/60 text-white">
                <option value="all">All staff</option>
                {workspace.members.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}
              </SelectInput>
            </div>
          </ProductPanel>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ProductStat label="Total jobs" value={filteredJobs.length} helper="matching filters" icon={<Briefcase className="h-5 w-5" />} />
            <ProductStat label="Scheduled" value={scheduled} helper="booked in" icon={<BarChart3 className="h-5 w-5" />} />
            <ProductStat label="In progress" value={inProgress} helper="being worked" icon={<BarChart3 className="h-5 w-5" />} />
            <ProductStat label="Completed" value={completed} helper="finished" icon={<CheckCircle2 className="h-5 w-5" />} />
            <ProductStat label="Cancelled" value={cancelled} helper="cancelled work" icon={<BarChart3 className="h-5 w-5" />} />
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <ProductStat label="Unassigned jobs" value={unassigned} helper="needs ownership" icon={<Briefcase className="h-5 w-5" />} />
            <ProductStat label="Team count" value={workspace.teams.length} helper="available teams" icon={<Users className="h-5 w-5" />} />
            <ProductStat label="Staff count" value={workspace.members.length} helper="active workspace members" icon={<Users className="h-5 w-5" />} />
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <WorkloadPanel title="Staff workload">
              {staffWorkload.length === 0 ? (
                <EmptyState title="No staff yet" description="Staff workload appears once team members are added." />
              ) : (
                staffWorkload.map(item => (
                  <WorkloadRow key={item.member.id} label={`${item.member.firstName} ${item.member.lastName}`} value={item.count} member={item.member} />
                ))
              )}
            </WorkloadPanel>
            <WorkloadPanel title="Team workload">
              {teamWorkload.length === 0 ? (
                <EmptyState title="No teams yet" description="Team workload appears once teams are created." />
              ) : (
                teamWorkload.map(item => (
                  <WorkloadRow key={item.team.id} label={item.team.name} value={item.count} team={item.team} />
                ))
              )}
            </WorkloadPanel>
          </div>

          {!workspace.entitlements.reportingEnabled && (
            <ProductPanel className="border-amber-400/30 bg-amber-500/10">
              <p className="text-sm font-semibold text-amber-100">Advanced reporting unlocks on Team, Business and Enterprise plans.</p>
            </ProductPanel>
          )}
        </>
      )}
    </ProductPage>
  );
}

function WorkloadPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ProductPanel>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </ProductPanel>
  );
}

function WorkloadRow({
  label,
  value,
  member,
  team,
}: {
  label: string;
  value: number;
  member?: CustomerStaffMember;
  team?: CustomerTeam;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-white">{label}</p>
          <p className="text-xs text-slate-400">{member?.roleName ?? team?.serviceArea ?? "Team"}</p>
        </div>
        <p className="text-2xl font-bold text-blue-300">{value}</p>
      </div>
    </div>
  );
}
