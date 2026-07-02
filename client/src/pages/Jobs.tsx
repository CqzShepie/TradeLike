import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, CalendarDays, CheckCircle2, Clock3, ListFilter, Plus } from "lucide-react";

import NewJobForm from "../components/jobs/NewJobForm";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  ProductPage,
  ProductPageHeader,
  ProductPanel,
  ProductStat,
  SecondaryButton,
  SelectMenu,
  StatusBadge,
  TextInput,
} from "../components/ui";
import { customerStaffService } from "../services/customerStaffService";
import type { CustomerStaffMember, CustomerTeam } from "../services/customerStaffService";
import { isApiError } from "../services/apiClient";
import { jobAssignmentsService } from "../services/jobAssignmentsService";
import type { JobAssignment } from "../services/jobAssignmentsService";
import { canUseStaffScheduling } from "../routes/planEntitlements";
import { useAuth } from "../hooks/useAuth";
import { useJobs } from "../hooks/useJobs";
import AccessDenied from "./AccessDenied";
import UpgradeRequired from "./UpgradeRequired";

import type { Job, JobPriority, JobStatus } from "../types/job";

function Jobs() {
  const {
    jobs,
    loading,
    error,
    reloadJobs,
    editingJob,
    addJob,
    updateJob,
    cancelEdit,
  } = useJobs();
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
  const { user } = useAuth();
  const showStaffScheduling = canUseStaffScheduling(user);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignmentData() {
      if (!showStaffScheduling) {
        setMembers([]);
        setTeams([]);
        setAssignments([]);
        return;
      }

      try {
        const [workspace, assignmentRows] = await Promise.all([
          customerStaffService.getWorkspace(),
          jobAssignmentsService.getAll(),
        ]);

        if (cancelled) {
          return;
        }

        setMembers(workspace.members.filter(member => member.status !== "Left"));
        setTeams(workspace.teams);
        setAssignments(assignmentRows);
      } catch {
        if (!cancelled) {
          setMembers([]);
          setTeams([]);
          setAssignments([]);
        }
      }
    }

    void loadAssignmentData();

    return () => {
      cancelled = true;
    };
  }, [showStaffScheduling]);

  const assignmentMap = useMemo(
    () => new Map(assignments.map(item => [item.jobId, item])),
    [assignments]
  );

  const filteredJobs = useMemo(
    () =>
      jobs.filter(job => {
        const assignment = assignmentMap.get(job.id);
        const assignedTeam = showStaffScheduling ? teams.find(team => team.id === assignment?.assignedTeamId) : null;
        const lead = showStaffScheduling ? members.find(member => member.id === assignment?.leadStaffMemberId) : null;
        const assignedStaff = showStaffScheduling ? members.filter(member => assignment?.assignedStaffMemberIds.includes(member.id)) : [];
        const searchText = search.trim().toLowerCase();
        const searchableText = [
          `job ${job.id}`,
          `job #${job.id}`,
          job.jobNumber ? `job ${job.jobNumber} job #${job.jobNumber}` : "",
          job.customer,
          job.jobTitle,
          job.status,
          job.priority,
          job.quoteId ? `quote ${job.quoteId}` : "",
          assignedTeam?.name ?? "",
          lead ? getMemberName(lead) : "",
          assignedStaff.map(getMemberName).join(" "),
          job.sourceQuote?.title ?? "",
          job.sourceQuote?.customerName ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return (
          (searchText === "" || searchableText.includes(searchText)) &&
          (statusFilter === "All" || job.status === statusFilter) &&
          (priorityFilter === "All" || job.priority === priorityFilter) &&
          (!showStaffScheduling || teamFilter === "All" || assignment?.assignedTeamId === Number(teamFilter)) &&
          (!showStaffScheduling || engineerFilter === "All" ||
            assignment?.leadStaffMemberId === Number(engineerFilter) ||
            assignment?.assignedStaffMemberIds.includes(Number(engineerFilter)) ||
            job.engineerId === Number(engineerFilter))
        );
      }),
    [assignmentMap, engineerFilter, jobs, members, priorityFilter, search, showStaffScheduling, statusFilter, teamFilter, teams]
  );

  const stats = [
    { label: "Total jobs", value: jobs.length, helper: "all visible jobs", icon: <Briefcase className="h-5 w-5" /> },
    { label: "Scheduled", value: countStatus(jobs, "Scheduled"), helper: "booked into the diary", icon: <CalendarDays className="h-5 w-5" /> },
    { label: "In progress", value: countStatus(jobs, "InProgress"), helper: "currently underway", icon: <Clock3 className="h-5 w-5" /> },
    { label: "Pending", value: jobs.filter(job => job.status === "Scheduled" && !isPreviousJob(job)).length, helper: "waiting to start", icon: <ListFilter className="h-5 w-5" /> },
    { label: "Completed", value: countStatus(jobs, "Completed"), helper: "finished jobs", icon: <CheckCircle2 className="h-5 w-5" /> },
  ];

  async function assignFirstAvailableMember(job: Job) {
    if (members.length === 0) {
      window.alert("Add team members first.");
      return;
    }

    const current = assignmentMap.get(job.id);
    const updated = await jobAssignmentsService.update(job.id, {
      assignedTeamId: current?.assignedTeamId ?? null,
      leadStaffMemberId: current?.leadStaffMemberId ?? members[0].id,
      assignedStaffMemberIds: current?.assignedStaffMemberIds ?? [],
      scheduledEndDate: current?.scheduledEndDate ?? null,
      calendarColour: current?.calendarColour ?? null,
    });

    setAssignments(updated);
  }

  if (isApiError(error) && error.status === 403) {
    return <AccessDenied />;
  }

  if (isApiError(error) && error.status === 402) {
    return <UpgradeRequired />;
  }

  return (
    <ProductPage>
      <ProductPageHeader
        eyebrow="Job command centre"
        title="Jobs"
        description="Plan work, track priorities, connect quotes, and keep teams aligned from one operational view."
        actions={
          <>
            <SecondaryButton type="button" onClick={() => navigate("/job-history")} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
              Previous Job Records
            </SecondaryButton>
            <PrimaryButton type="button" onClick={() => setShowForm(previous => !previous)}>
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {showForm || editingJob ? "Close form" : "Add New Job"}
              </span>
            </PrimaryButton>
          </>
        }
      />

      {loading && <LoadingState title="Loading jobs" description="Fetching scheduled work, assignments, and linked quote details." />}

      {!loading && error && (
        <ErrorState
          title="Unable to load jobs"
          description={error.message}
          action={
            <SecondaryButton type="button" onClick={reloadJobs} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
              Try again
            </SecondaryButton>
          }
        />
      )}

      {!loading && !error && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {stats.map(stat => (
              <ProductStat key={stat.label} label={stat.label} value={stat.value} helper={stat.helper} icon={stat.icon} />
            ))}
          </section>

          {editingJob && (
            <ProductPanel className="border-blue-400/30 bg-blue-500/10">
              <p className="text-sm font-semibold text-blue-100">Editing: {editingJob.jobTitle}</p>
            </ProductPanel>
          )}

          {(showForm || editingJob) && (
            <ProductPanel>
              <NewJobForm
                onAddJob={async job => {
                  await addJob(job);
                  setShowForm(false);
                }}
                onUpdateJob={async job => {
                  await updateJob(job);
                  setShowForm(false);
                }}
                editingJob={editingJob}
                onJobChange={() => {
                  void reloadJobs();
                }}
                onCancelEdit={() => {
                  cancelEdit();
                  setShowForm(false);
                }}
              />
            </ProductPanel>
          )}

          <ProductPanel>
            <div className="flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">Work queue</p>
                <h2 className="mt-2 text-xl font-bold text-white">Job overview</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {showStaffScheduling
                    ? "Filter by status, priority, team, engineer, customer, job number or linked quote."
                    : "Filter by status, priority, customer, job number or linked quote."}
                </p>
              </div>
              <p className="text-sm font-semibold text-slate-300">
                {filteredJobs.length} of {jobs.length} shown
              </p>
            </div>

            <div className={showStaffScheduling ? "mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_170px_170px_170px_170px]" : "mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_170px_170px]"}>
              <TextInput
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={showStaffScheduling ? "Search jobs, client, job number, quote, team or engineer..." : "Search jobs, client, job number or quote..."}
                className="border-white/10 bg-slate-950/60 text-white placeholder:text-slate-500"
              />
              <SelectMenu
                ariaLabel="Job status filter"
                value={statusFilter}
                onChange={value => setStatusFilter(value as JobStatus | "All")}
                options={[
                  { value: "All", label: "All statuses" },
                  { value: "Scheduled", label: "Scheduled" },
                  { value: "InProgress", label: "In progress" },
                  { value: "Completed", label: "Completed" },
                  { value: "Cancelled", label: "Cancelled" },
                ]}
              />
              <SelectMenu
                ariaLabel="Job priority filter"
                value={priorityFilter}
                onChange={value => setPriorityFilter(value as JobPriority | "All")}
                options={[
                  { value: "All", label: "All priorities" },
                  { value: "Low", label: "Low" },
                  { value: "Normal", label: "Normal" },
                  { value: "High", label: "High" },
                  { value: "Urgent", label: "Urgent" },
                ]}
              />
              {showStaffScheduling && (
                <>
                  <SelectMenu
                    ariaLabel="Job team filter"
                    value={teamFilter}
                    onChange={setTeamFilter}
                    options={[
                      { value: "All", label: "All teams" },
                      ...teams.map(team => ({ value: String(team.id), label: team.name })),
                    ]}
                  />
                  <SelectMenu
                    ariaLabel="Job engineer filter"
                    value={engineerFilter}
                    onChange={setEngineerFilter}
                    options={[
                      { value: "All", label: "All engineers" },
                      ...members.map(member => ({ value: String(member.id), label: getMemberName(member) })),
                    ]}
                  />
                </>
              )}
            </div>

            <div className="mt-6">
              {filteredJobs.length === 0 ? (
                <EmptyState
                  title="No jobs found."
                  description={jobs.length === 0 ? "Add your first job to start building the schedule." : "Try adjusting the filters to see more work."}
                  action={
                    <PrimaryButton type="button" onClick={() => setShowForm(true)}>
                      Add New Job
                    </PrimaryButton>
                  }
                />
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-2xl border border-white/10 lg:block">
                    <table className="min-w-full divide-y divide-white/10 text-sm">
                      <thead className="bg-white/[0.03] text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Job</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Date & time</th>
                          {showStaffScheduling && <th className="px-4 py-3">Engineer</th>}
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Priority</th>
                          <th className="px-4 py-3">Linked quote</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {filteredJobs.map(job => (
                          <JobRow
                            key={job.id}
                            job={job}
                            assignment={assignmentMap.get(job.id)}
                            members={members}
                            showStaffScheduling={showStaffScheduling}
                            onView={() => navigate(`/jobs/${job.id}`)}
                            onAssign={() => void assignFirstAvailableMember(job)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-4 lg:hidden">
                    {filteredJobs.map(job => (
                      <JobMobileCard
                        key={job.id}
                        job={job}
                        assignment={assignmentMap.get(job.id)}
                        members={members}
                        showStaffScheduling={showStaffScheduling}
                        onAssign={() => void assignFirstAvailableMember(job)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </ProductPanel>
        </>
      )}
    </ProductPage>
  );
}

function JobRow({
  job,
  assignment,
  members,
  showStaffScheduling,
  onView,
  onAssign,
}: {
  job: Job;
  assignment?: JobAssignment;
  members: CustomerStaffMember[];
  showStaffScheduling: boolean;
  onView: () => void;
  onAssign: () => void;
}) {
  return (
    <tr className="align-top text-slate-200 transition hover:bg-white/[0.03]">
      <td className="px-4 py-4">
        <p className="font-semibold text-white">#{getJobDisplayNumber(job)} {job.jobTitle}</p>
        <p className="mt-1 text-xs text-slate-400">{job.address || "No address saved"}</p>
      </td>
      <td className="px-4 py-4">{job.customer}</td>
      <td className="px-4 py-4">{formatDateTime(job.scheduledDate)}</td>
      {showStaffScheduling && <td className="px-4 py-4">{getAssignmentLabel(job, assignment, members)}</td>}
      <td className="px-4 py-4"><StatusBadge status={job.status} /></td>
      <td className="px-4 py-4"><PriorityPill priority={job.priority} /></td>
      <td className="px-4 py-4">{job.quoteId ? <Link to={`/quotes/${job.quoteId}`} className="font-semibold text-blue-300 hover:text-blue-200">Quote #{job.quoteId}</Link> : <span className="text-slate-500">None</span>}</td>
      <td className="px-4 py-4">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onView} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/10">View</button>
          {showStaffScheduling && (
            <button type="button" onClick={onAssign} className="rounded-lg border border-blue-400/30 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-500/10">
              {members.length === 0 ? "Add team members first" : getAssignmentLabel(job, assignment, members) === "Unassigned" ? "Assign" : "Change"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function JobMobileCard({
  job,
  assignment,
  members,
  showStaffScheduling,
  onAssign,
}: {
  job: Job;
  assignment?: JobAssignment;
  members: CustomerStaffMember[];
  showStaffScheduling: boolean;
  onAssign: () => void;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Job #{getJobDisplayNumber(job)}</p>
          <Link to={`/jobs/${job.id}`} className="mt-1 block text-lg font-bold text-white hover:text-blue-200">{job.jobTitle}</Link>
          <p className="mt-1 text-sm text-slate-400">{job.customer}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
        <Info label="Date" value={formatDateTime(job.scheduledDate)} />
        {showStaffScheduling && <Info label="Engineer" value={getAssignmentLabel(job, assignment, members)} />}
        <Info label="Priority" value={job.priority} />
        <Info label="Quote" value={job.quoteId ? `Quote #${job.quoteId}` : "None"} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/jobs/${job.id}`} className="inline-flex rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10">
          View
        </Link>
        {showStaffScheduling && (
          <button type="button" onClick={onAssign} className="rounded-lg border border-blue-400/30 px-3 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-500/10">
            {members.length === 0 ? "Add team members first" : getAssignmentLabel(job, assignment, members) === "Unassigned" ? "Assign" : "Change"}
          </button>
        )}
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-200">{value}</p>
    </div>
  );
}

function PriorityPill({ priority }: { priority: JobPriority }) {
  const tone = {
    Low: "border-blue-400/20 bg-blue-500/10 text-blue-200",
    Normal: "border-slate-400/20 bg-slate-500/10 text-slate-200",
    High: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    Urgent: "border-red-400/30 bg-red-500/10 text-red-200",
  }[priority];

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{priority}</span>;
}

function isPreviousJob(job: Job) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return job.status === "Completed" || job.status === "Cancelled" || new Date(job.scheduledDate) < today;
}

function countStatus(jobs: Job[], status: JobStatus) {
  return jobs.filter(job => job.status === status).length;
}

function getMemberName(member: CustomerStaffMember) {
  return `${member.firstName} ${member.lastName}`.trim();
}

function getAssignmentLabel(job: Job, assignment: JobAssignment | undefined, members: CustomerStaffMember[]) {
  const lead = members.find(member => member.id === assignment?.leadStaffMemberId || member.id === job.engineerId);

  if (lead) {
    return getMemberName(lead);
  }

  if (assignment?.assignedStaffMemberIds.length) {
    return `${assignment.assignedStaffMemberIds.length} assigned`;
  }

  return "Unassigned";
}

function getJobDisplayNumber(job: Job) {
  return job.jobNumber ?? job.id;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default Jobs;
