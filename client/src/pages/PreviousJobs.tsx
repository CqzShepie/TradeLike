import { useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  LoadingState,
  ProductPage,
  ProductPageHeader,
  ProductPanel,
  SelectInput,
  StatusBadge,
  TextInput,
} from "../components/ui";
import { customerStaffService } from "../services/customerStaffService";
import type { CustomerStaffMember, CustomerTeam } from "../services/customerStaffService";
import { jobAssignmentsService } from "../services/jobAssignmentsService";
import type { JobAssignment } from "../services/jobAssignmentsService";
import { jobsService } from "../services/jobsService";
import type { Job, JobStatus } from "../types/job";

export default function PreviousJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [members, setMembers] = useState<CustomerStaffMember[]>([]);
  const [teams, setTeams] = useState<CustomerTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [staffFilter, setStaffFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "All">("All");

  useEffect(() => {
    async function load() {
      const [allJobs, previousAssignments, workspace] = await Promise.all([
        jobsService.getAll(),
        jobAssignmentsService.getPrevious(),
        customerStaffService.getWorkspace(),
      ]);
      setJobs(allJobs);
      setAssignments(previousAssignments);
      setMembers(workspace.members);
      setTeams(workspace.teams);
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, []);

  const assignmentMap = useMemo(() => new Map(assignments.map(item => [item.jobId, item])), [assignments]);

  const previousJobs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const query = search.trim().toLowerCase();

    return jobs
      .filter(job => job.status === "Completed" || job.status === "Cancelled" || new Date(job.scheduledDate) < today)
      .filter(job => statusFilter === "All" || job.status === statusFilter)
      .filter(job => {
        const assignment = assignmentMap.get(job.id);

        if (staffFilter !== "all") {
          const staffId = Number(staffFilter);
          if (!assignment?.assignedStaffMemberIds.includes(staffId) && assignment?.leadStaffMemberId !== staffId) {
            return false;
          }
        }

        if (teamFilter !== "all" && assignment?.assignedTeamId !== Number(teamFilter)) {
          return false;
        }

        if (!query) {
          return true;
        }

        return [job.customer, job.phone, job.jobTitle, job.address, job.status, job.priority, job.notes ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
  }, [assignmentMap, jobs, search, staffFilter, statusFilter, teamFilter]);

  function memberName(id?: number | null) {
    const member = members.find(item => item.id === id);
    return member ? `${member.firstName} ${member.lastName}` : "Not assigned";
  }

  function teamName(id?: number | null) {
    return teams.find(team => team.id === id)?.name ?? "No team";
  }

  return (
    <ProductPage>
      <ProductPageHeader
        eyebrow="Job history"
        title="Previous Jobs"
        description="Scroll and filter completed, cancelled, and older jobs by customer, engineer, team, and status."
      />

      <ProductPanel>
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_180px]">
          <TextInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Search previous jobs..." className="border-white/10 bg-slate-950/60 text-white placeholder:text-slate-500" />
          <SelectInput value={staffFilter} onChange={event => setStaffFilter(event.target.value)} className="border-white/10 bg-slate-950/60 text-white">
            <option value="all">All engineers/staff</option>
            {members.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}
          </SelectInput>
          <SelectInput value={teamFilter} onChange={event => setTeamFilter(event.target.value)} className="border-white/10 bg-slate-950/60 text-white">
            <option value="all">All teams</option>
            {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
          </SelectInput>
          <SelectInput value={statusFilter} onChange={event => setStatusFilter(event.target.value as JobStatus | "All")} className="border-white/10 bg-slate-950/60 text-white">
            <option value="All">All statuses</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Scheduled">Past scheduled</option>
            <option value="InProgress">Past in progress</option>
          </SelectInput>
        </div>
      </ProductPanel>

      {loading ? (
        <LoadingState title="Loading previous jobs" description="Collecting historic jobs and assignment data." />
      ) : (
        <div className="max-h-[720px] space-y-3 overflow-y-auto pr-2">
          {previousJobs.map(job => {
            const assignment = assignmentMap.get(job.id);
            return (
              <article key={job.id} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Job #{job.id}</p>
                    <h2 className="text-lg font-bold text-white">{job.jobTitle}</h2>
                    <p className="mt-1 text-sm text-slate-300">{job.customer} - {job.phone}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-4">
                  <p><span className="font-semibold text-white">Date:</span> {new Date(job.scheduledDate).toLocaleString("en-GB")}</p>
                  <p><span className="font-semibold text-white">Lead:</span> {memberName(assignment?.leadStaffMemberId)}</p>
                  <p><span className="font-semibold text-white">Team:</span> {teamName(assignment?.assignedTeamId)}</p>
                  <p><span className="font-semibold text-white">Staff:</span> {(assignment?.assignedStaffMemberIds ?? []).map(memberName).join(", ") || "Not assigned"}</p>
                </div>
                <p className="mt-3 text-sm text-slate-300">{job.address}</p>
                {job.notes && <p className="mt-3 rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">{job.notes}</p>}
              </article>
            );
          })}
          {previousJobs.length === 0 && (
            <EmptyState title="No previous jobs match these filters" description="Try widening the search, team, staff or status filters." />
          )}
        </div>
      )}
    </ProductPage>
  );
}
