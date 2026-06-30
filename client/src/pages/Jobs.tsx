import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import SectionHeader from "../components/ui/SectionHeader";
import StatsGrid from "../components/ui/StatsGrid";
import JobList from "../components/jobs/JobList";
import NewJobForm from "../components/jobs/NewJobForm";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { customerStaffService } from "../services/customerStaffService";
import type { CustomerStaffMember, CustomerTeam } from "../services/customerStaffService";
import { jobAssignmentsService } from "../services/jobAssignmentsService";
import type { JobAssignment } from "../services/jobAssignmentsService";
import { useJobs } from "../hooks/useJobs";
import type { Job, JobPriority, JobStatus } from "../types/job";

function Jobs() {
  const { jobs, loading, editingJob, addJob, startEdit, updateJob, cancelEdit } = useJobs();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<JobPriority | "All">("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [engineerFilter, setEngineerFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [members, setMembers] = useState<CustomerStaffMember[]>([]);
  const [teams, setTeams] = useState<CustomerTeam[]>([]);
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function loadAssignmentData() {
      try {
        const [workspace, assignmentRows] = await Promise.all([customerStaffService.getWorkspace(), jobAssignmentsService.getAll()]);
        if (cancelled) return;
        setMembers(workspace.members.filter(member => member.status !== "Left"));
        setTeams(workspace.teams);
        setAssignments(assignmentRows);
      } catch {
        if (cancelled) return;
        setMembers([]);
        setTeams([]);
        setAssignments([]);
      }
    }
    loadAssignmentData();
    return () => { cancelled = true; };
  }, []);

  const assignmentMap = useMemo(() => new Map(assignments.map(item => [item.jobId, item])), [assignments]);
  const previousJobs = jobs.filter(isPreviousJob);

  const filteredJobs = jobs.filter(job => {
    const assignment = assignmentMap.get(job.id);
    const assignedTeam = teams.find(team => team.id === assignment?.assignedTeamId);
    const lead = members.find(member => member.id === assignment?.leadStaffMemberId);
    const assignedStaff = members.filter(member => assignment?.assignedStaffMemberIds.includes(member.id));
    const searchText = search.trim().toLowerCase();
    const searchableText = [`job ${job.id}`, `job #${job.id}`, job.customer, job.jobTitle, job.status, job.priority, job.quoteId ? `quote ${job.quoteId}` : "", job.quoteId ? `quote #${job.quoteId}` : "", assignedTeam?.name ?? "", lead ? `${lead.firstName} ${lead.lastName}` : "", assignedStaff.map(member => `${member.firstName} ${member.lastName}`).join(" "), job.sourceQuote?.title ?? "", job.sourceQuote?.customerName ?? ""].join(" ").toLowerCase();
    const matchesSearch = searchText === "" || searchableText.includes(searchText);
    const matchesStatus = statusFilter === "All" || job.status === statusFilter;
    const matchesPriority = priorityFilter === "All" || job.priority === priorityFilter;
    const matchesTeam = teamFilter === "All" || assignment?.assignedTeamId === Number(teamFilter);
    const matchesEngineer = engineerFilter === "All" || assignment?.leadStaffMemberId === Number(engineerFilter) || assignment?.assignedStaffMemberIds.includes(Number(engineerFilter)) || job.engineerId === Number(engineerFilter);
    return matchesSearch && matchesStatus && matchesPriority && matchesTeam && matchesEngineer;
  });

  return <div className="min-h-screen bg-slate-50"><Sidebar /><main className="md:pl-64"><section className="mx-auto max-w-7xl px-6 py-8">{loading ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading...</div> : <><SectionHeader title="Jobs" subtitle="Manage scheduled work, site notes, priorities, quote references, staff assignment, and team scheduling." action={<div className="flex flex-wrap gap-2"><button type="button" onClick={() => navigate("/job-history")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white">Previous Job Records</button><Button onClick={() => setShowForm(prev => !prev)}>{showForm ? "Close Form" : "+ New Job"}</Button></div>} />
  <StatsGrid stats={[{ title: "Scheduled", value: jobs.filter(job => job.status === "Scheduled").length }, { title: "In Progress", value: jobs.filter(job => job.status === "InProgress").length }, { title: "Completed", value: jobs.filter(job => job.status === "Completed").length }, { title: "Previous Job Records", value: previousJobs.length }]} />
  {editingJob && <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">Editing: {editingJob.jobTitle}</div>}
  {(showForm || editingJob) && <div className="mt-6"><NewJobForm onAddJob={addJob} onUpdateJob={updateJob} editingJob={editingJob} onCancelEdit={() => { cancelEdit(); setShowForm(false); }} /></div>}
  <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 md:grid-cols-[1fr_180px_180px_180px_180px]"><Input placeholder="Search jobs, client, job number, quote, team or engineer..." value={search} onChange={event => setSearch(event.target.value)} /><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as JobStatus | "All")} className="rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="All">All Statuses</option><option value="Scheduled">Scheduled</option><option value="InProgress">In Progress</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option></select><select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value as JobPriority | "All")} className="rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="All">All Priorities</option><option value="Low">Low</option><option value="Normal">Normal</option><option value="High">High</option><option value="Urgent">Urgent</option></select><select value={teamFilter} onChange={event => setTeamFilter(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="All">All Teams</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select value={engineerFilter} onChange={event => setEngineerFilter(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="All">All Engineers</option>{members.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}</select></div></div>
  <div className="mt-6"><JobList jobs={filteredJobs} onViewJob={(job: Job) => navigate(`/jobs/${job.id}`)} teams={teams} members={members} getAssignment={jobId => assignmentMap.get(jobId)} />{filteredJobs.length === 0 && <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">No matching jobs found.</div>}</div>
</>}</section></main></div>;
}

function isPreviousJob(job: Job) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return job.status === "Completed" || job.status === "Cancelled" || new Date(job.scheduledDate) < today;
}

export default Jobs;
