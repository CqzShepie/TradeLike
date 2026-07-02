import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  SelectMenu,
} from "../components/ui";
import { customerStaffService } from "../services/customerStaffService";
import { jobAssignmentsService } from "../services/jobAssignmentsService";
import type { JobAssignment } from "../services/jobAssignmentsService";
import { jobsService } from "../services/jobsService";
import { isApiError } from "../services/apiClient";
import { reportsService, type BusinessReport, type JobReportRow, type ReportRange, type ReportsSummary, type TeamReport } from "../services/reportsService";
import type { CustomerStaffMember, CustomerStaffWorkspace, CustomerTeam } from "../services/customerStaffService";
import type { Job } from "../types/job";
import { useAuth } from "../hooks/useAuth";
import { hasFeature, isAtLeastPlan } from "../routes/planEntitlements";
import { friendlyErrorMessage } from "../utils/errorMessages";
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
  const [range, setRange] = useState<ReportRange>("this-month");
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [jobRows, setJobRows] = useState<JobReportRow[]>([]);
  const [teamReport, setTeamReport] = useState<TeamReport | null>(null);
  const [businessReport, setBusinessReport] = useState<BusinessReport | null>(null);
  const [detailTitle, setDetailTitle] = useState<string | null>(null);
  const { user } = useAuth();
  const showTeamReports = hasFeature(user?.plan, "staff-scheduling");
  const showBusinessReports = isAtLeastPlan(user?.plan, "Business");
  const reportTier = showBusinessReports ? "Advanced + Custom" : showTeamReports ? "Advanced" : "Basic";

  useEffect(() => {
    void loadReports();
  }, [range]);

  async function loadReports() {
    try {
      setLoading(true);
      setError(null);
      const [jobRows, assignmentRows, staffWorkspace, summaryReport, jobReportRows] = await Promise.all([
        jobsService.getAll(),
        showTeamReports ? jobAssignmentsService.getAll() : Promise.resolve([]),
        showTeamReports ? customerStaffService.getWorkspace() : Promise.resolve(blankWorkspace),
        reportsService.getSummary(range),
        reportsService.getJobs(range),
      ]);

      setJobs(jobRows);
      setAssignments(assignmentRows);
      setWorkspace(staffWorkspace);
      setSummary(summaryReport);
      setJobRows(jobReportRows);

      const [team, business] = await Promise.all([
        showTeamReports ? reportsService.getTeam(range).catch(() => null) : Promise.resolve(null),
        showBusinessReports ? reportsService.getBusiness(range).catch(() => null) : Promise.resolve(null),
      ]);

      setTeamReport(team);
      setBusinessReport(business);
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
  const scheduled = filteredJobs.filter(job => job.status === "Scheduled").length;
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
        description="Track job volume, completion, quotes, invoices and team workload from real tenant data."
        actions={
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
            <p className="font-bold text-white">{workspace.entitlements.planName}</p>
            <p className="text-slate-400">Reporting: {reportTier}</p>
          </div>
        }
      />

      {loading && <LoadingState title="Loading reports" description="Pulling together jobs, teams, and staff workload." />}

      {!loading && error && (
        <ErrorState
          title="Unable to load reports"
          description={friendlyErrorMessage(error, "Reports could not be loaded. Please try again.")}
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
              <SelectMenu
                ariaLabel="Reports date range"
                value={range}
                onChange={value => setRange(value as ReportRange)}
                options={[
                  { value: "this-month", label: "This month" },
                  { value: "last-month", label: "Last month" },
                  { value: "last-30-days", label: "Last 30 days" },
                  { value: "last-90-days", label: "Last 90 days" },
                  { value: "year-to-date", label: "Year to date" },
                ]}
              />
            </div>
          </ProductPanel>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ProductStat label="Completed" value={summary?.jobsCompleted ?? completed} helper="selected range" icon={<CheckCircle2 className="h-5 w-5" />} />
            <ProductStat label="Completed last period" value={summary?.jobsCompletedPreviousPeriod ?? 0} helper="comparison" icon={<BarChart3 className="h-5 w-5" />} />
            <ProductStat label="Scheduled" value={summary?.jobsScheduled ?? scheduled} helper="selected range" icon={<Briefcase className="h-5 w-5" />} />
            <ProductStat label="Open jobs" value={summary?.openJobs ?? filteredJobs.length} helper="still active" icon={<Briefcase className="h-5 w-5" />} />
            <ProductStat label="Overdue" value={summary?.overdueJobs ?? 0} helper="needs attention" icon={<BarChart3 className="h-5 w-5" />} />
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <ProductStat label="Avg completed/week" value={summary?.averageCompletedPerWeek ?? 0} helper="selected range" icon={<BarChart3 className="h-5 w-5" />} />
            <ProductStat label="Avg completed/month" value={summary?.averageCompletedPerMonth ?? 0} helper="selected range" icon={<BarChart3 className="h-5 w-5" />} />
            <ProductStat label="Completion rate" value={`${summary?.completionRatePercent ?? 0}%`} helper="completed vs scheduled" icon={<CheckCircle2 className="h-5 w-5" />} />
          </section>

          <ProductPanel>
            <h2 className="text-lg font-bold text-white">Jobs by status</h2>
            <div className="mt-4">
              {jobRows.length === 0 ? (
                <p className="text-sm text-slate-400">Not enough job data in this range yet.</p>
              ) : (
                <BarChart rows={jobRows.map(row => ({ label: row.status, value: row.count }))} onOpen={label => setDetailTitle(`Jobs: ${label}`)} />
              )}
            </div>
          </ProductPanel>

          {showTeamReports && (
            <ProductPanel>
              <h2 className="text-lg font-bold text-white">Team reports</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ProductStat label="Unassigned jobs" value={teamReport?.unassignedJobs ?? unassigned} helper="selected range" icon={<Briefcase className="h-5 w-5" />} />
                <ProductStat label="Team members" value={teamReport?.rows.length ?? workspace.members.length} helper="available staff" icon={<Users className="h-5 w-5" />} />
              </div>
              {teamReport?.timeTrackingMessage && <p className="mt-4 text-sm text-slate-400">{teamReport.timeTrackingMessage}</p>}
              {teamReport && <div className="mt-4"><BarChart rows={teamReport.rows.map(row => ({ label: row.name, value: row.assignedJobs }))} onOpen={label => setDetailTitle(`Team workload: ${label}`)} /></div>}
            </ProductPanel>
          )}

          {showBusinessReports && (
            <ProductPanel>
              <h2 className="text-lg font-bold text-white">Business reports</h2>
              {businessReport ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <ProductStat label="Quote total" value={formatMoney(businessReport.quoteTotal)} helper={`${businessReport.quoteCount} quotes`} icon={<BarChart3 className="h-5 w-5" />} />
                  <ProductStat label="Accepted quotes" value={formatMoney(businessReport.acceptedQuoteTotal)} helper={`${businessReport.quoteConversionRatePercent}% conversion`} icon={<CheckCircle2 className="h-5 w-5" />} />
                  <ProductStat label="Invoice total" value={formatPence(businessReport.invoiceTotalPence)} helper="selected range" icon={<BarChart3 className="h-5 w-5" />} />
                  <ProductStat label="Unpaid invoices" value={formatPence(businessReport.unpaidInvoiceTotalPence)} helper="needs collection" icon={<BarChart3 className="h-5 w-5" />} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">Business reporting data is not available yet.</p>
              )}
              {businessReport && (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <MiniBar label="Quote conversion" value={businessReport.quoteConversionRatePercent} max={100} onClick={() => setDetailTitle("Quote conversion")} />
                  <MiniBar label="Paid invoice share" value={businessReport.invoiceTotalPence === 0 ? 0 : Math.round((businessReport.paidInvoiceTotalPence / businessReport.invoiceTotalPence) * 100)} max={100} onClick={() => setDetailTitle("Invoice payment status")} />
                </div>
              )}
            </ProductPanel>
          )}

          {showTeamReports && (
          <ProductPanel>
            <div className="grid gap-3 md:grid-cols-2">
              <SelectMenu
                ariaLabel="Reports team filter"
                value={teamFilter}
                onChange={setTeamFilter}
                options={[
                  { value: "all", label: "All teams" },
                  ...workspace.teams.map(team => ({ value: String(team.id), label: team.name })),
                ]}
              />
              <SelectMenu
                ariaLabel="Reports staff filter"
                value={staffFilter}
                onChange={setStaffFilter}
                options={[
                  { value: "all", label: "All staff" },
                  ...workspace.members.map(member => ({ value: String(member.id), label: `${member.firstName} ${member.lastName}` })),
                ]}
              />
            </div>
          </ProductPanel>
          )}

          {showTeamReports && <div className="grid gap-6 xl:grid-cols-2">
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
          </div>}
        </>
      )}
      {detailTitle && (
        <ReportModal title={detailTitle} onClose={() => setDetailTitle(null)}>
          <p className="text-sm leading-6 text-slate-300">
            These figures are calculated from real tenant jobs, quotes, invoices and assignments for the selected date range.
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
            Export CSV is available from the current loaded report rows.
          </div>
          <button type="button" onClick={() => exportCsv(jobRows)} className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">
            Export CSV
          </button>
        </ReportModal>
      )}
    </ProductPage>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}

function formatPence(value: number) {
  return formatMoney(value / 100);
}

function WorkloadPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ProductPanel>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </ProductPanel>
  );
}

function BarChart({ rows, onOpen }: { rows: Array<{ label: string; value: number }>; onOpen: (label: string) => void }) {
  const max = Math.max(1, ...rows.map(row => row.value));

  return (
    <div className="space-y-3" role="list" aria-label="Report chart">
      {rows.map(row => (
        <button key={row.label} type="button" onClick={() => onOpen(row.label)} className="grid w-full gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-left hover:bg-white/[0.04] sm:grid-cols-[140px_minmax(0,1fr)_48px] sm:items-center">
          <span className="text-sm font-semibold text-white">{row.label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-slate-800">
            <span className="block h-full rounded-full bg-blue-500" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
          </span>
          <span className="text-sm font-bold text-blue-200">{row.value}</span>
        </button>
      ))}
    </div>
  );
}

function MiniBar({ label, value, max, onClick }: { label: string; value: number; max: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-left hover:bg-white/[0.04]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-sm font-bold text-blue-200">{value}%</p>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(4, Math.min(100, (value / max) * 100))}%` }} />
      </div>
    </button>
  );
}

function ReportModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/60">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded px-2 text-xl leading-none text-slate-400 hover:bg-white/10" aria-label="Close report details">x</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function exportCsv(rows: JobReportRow[]) {
  const csv = ["status,count", ...rows.map(row => `${row.status},${row.count}`)].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tradelike-reports.csv";
  link.click();
  URL.revokeObjectURL(url);
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
