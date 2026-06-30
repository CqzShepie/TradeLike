import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
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
          if (!assignment?.assignedStaffMemberIds.includes(staffId) && assignment?.leadStaffMemberId !== staffId) return false;
        }
        if (teamFilter !== "all" && assignment?.assignedTeamId !== Number(teamFilter)) return false;
        if (!query) return true;
        return [job.customer, job.phone, job.jobTitle, job.address, job.status, job.priority, job.notes ?? ""].join(" ").toLowerCase().includes(query);
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
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <section className="min-w-0 flex-1 p-10">
        <div className="max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Job history</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Previous Jobs</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Scroll and filter completed, cancelled, and older jobs by customer, engineer, team, and status.
          </p>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_180px]">
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search previous jobs..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600" />
              <select value={staffFilter} onChange={event => setStaffFilter(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"><option value="all">All engineers/staff</option>{members.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}</select>
              <select value={teamFilter} onChange={event => setTeamFilter(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"><option value="all">All teams</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
              <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as JobStatus | "All")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"><option value="All">All statuses</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option><option value="Scheduled">Past scheduled</option><option value="InProgress">Past in progress</option></select>
            </div>
          </div>

          {loading ? <p className="mt-6 text-sm text-slate-500">Loading previous jobs...</p> : (
            <div className="mt-6 max-h-[720px] space-y-3 overflow-y-auto pr-2">
              {previousJobs.map(job => {
                const assignment = assignmentMap.get(job.id);
                return <article key={job.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-slate-500">Job #{job.id}</p><h2 className="text-lg font-bold text-slate-900">{job.jobTitle}</h2><p className="mt-1 text-sm text-slate-600">{job.customer} · {job.phone}</p></div><div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{job.status}</div></div><div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-4"><p><span className="font-semibold text-slate-900">Date:</span> {new Date(job.scheduledDate).toLocaleString("en-GB")}</p><p><span className="font-semibold text-slate-900">Lead:</span> {memberName(assignment?.leadStaffMemberId)}</p><p><span className="font-semibold text-slate-900">Team:</span> {teamName(assignment?.assignedTeamId)}</p><p><span className="font-semibold text-slate-900">Staff:</span> {(assignment?.assignedStaffMemberIds ?? []).map(memberName).join(", ") || "Not assigned"}</p></div><p className="mt-3 text-sm text-slate-600">{job.address}</p>{job.notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{job.notes}</p>}</article>;
              })}
              {previousJobs.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">No previous jobs match these filters.</p>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
