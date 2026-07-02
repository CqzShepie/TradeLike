import { apiClient } from "./apiClient";

export type ReportRange = "this-month" | "last-month" | "last-30-days" | "last-90-days" | "year-to-date";

export type ReportsSummary = {
  fromUtc: string;
  toUtc: string;
  jobsCompleted: number;
  jobsCompletedPreviousPeriod: number;
  jobsScheduled: number;
  openJobs: number;
  overdueJobs: number;
  averageCompletedPerWeek: number;
  averageCompletedPerMonth: number;
  completionRatePercent: number;
};

export type JobReportRow = {
  status: string;
  count: number;
};

export type TeamReportRow = {
  staffMemberId: number;
  name: string;
  roleName: string;
  assignedJobs: number;
  completedJobs: number;
};

export type TeamReport = {
  rows: TeamReportRow[];
  unassignedJobs: number;
  timeTrackingMessage: string;
};

export type BusinessReport = {
  quoteCount: number;
  acceptedQuoteCount: number;
  quoteConversionRatePercent: number;
  quoteTotal: number;
  acceptedQuoteTotal: number;
  invoiceTotalPence: number;
  paidInvoiceTotalPence: number;
  unpaidInvoiceTotalPence: number;
};

function rangeQuery(range: ReportRange) {
  return `?range=${encodeURIComponent(range)}`;
}

export const reportsService = {
  getSummary(range: ReportRange) {
    return apiClient.get<ReportsSummary>(`/reports/summary${rangeQuery(range)}`);
  },

  getJobs(range: ReportRange) {
    return apiClient.get<JobReportRow[]>(`/reports/jobs${rangeQuery(range)}`);
  },

  getTeam(range: ReportRange) {
    return apiClient.get<TeamReport>(`/reports/team${rangeQuery(range)}`);
  },

  getBusiness(range: ReportRange) {
    return apiClient.get<BusinessReport>(`/reports/business${rangeQuery(range)}`);
  },
};
