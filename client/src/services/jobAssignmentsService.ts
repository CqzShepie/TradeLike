import { apiClient } from "./apiClient";

export type JobAssignment = {
  jobId: number;
  assignedTeamId?: number | null;
  leadStaffMemberId?: number | null;
  assignedStaffMemberIds: number[];
  scheduledEndDate?: string | null;
  calendarColour?: string | null;
};

export type UpdateJobAssignmentRequest = {
  assignedTeamId?: number | null;
  leadStaffMemberId?: number | null;
  assignedStaffMemberIds: number[];
  scheduledEndDate?: string | null;
  calendarColour?: string | null;
};

function normalizeAssignment(row: JobAssignment): JobAssignment {
  return {
    ...row,
    assignedStaffMemberIds: Array.isArray(row.assignedStaffMemberIds)
      ? row.assignedStaffMemberIds
      : [],
  };
}

export const jobAssignmentsService = {
  async getAll() {
    const rows = (await apiClient.get("/job-assignments")) as JobAssignment[];
    return rows.map(normalizeAssignment);
  },

  async getPrevious() {
    const rows = (await apiClient.get("/job-assignments/previous")) as JobAssignment[];
    return rows.map(normalizeAssignment);
  },

  async update(jobId: number, request: UpdateJobAssignmentRequest) {
    const rows = (await apiClient.put(`/job-assignments/${jobId}`, {
      assignedTeamId: request.assignedTeamId ?? null,
      leadStaffMemberId: request.leadStaffMemberId ?? null,
      assignedStaffMemberIds: request.assignedStaffMemberIds,
      scheduledEndDate: request.scheduledEndDate ?? null,
      calendarColour: request.calendarColour ?? null,
    })) as JobAssignment[];

    return rows.map(normalizeAssignment);
  },
};
