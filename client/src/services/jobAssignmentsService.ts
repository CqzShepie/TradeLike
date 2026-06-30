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

export const jobAssignmentsService = {
  async getAll() {
    return (await apiClient.get("/job-assignments")) as JobAssignment[];
  },

  async getPrevious() {
    return (await apiClient.get("/job-assignments/previous")) as JobAssignment[];
  },

  async update(jobId: number, request: UpdateJobAssignmentRequest) {
    return (await apiClient.put(`/job-assignments/${jobId}`, {
      assignedTeamId: request.assignedTeamId ?? null,
      leadStaffMemberId: request.leadStaffMemberId ?? null,
      assignedStaffMemberIds: request.assignedStaffMemberIds,
      scheduledEndDate: request.scheduledEndDate ?? null,
      calendarColour: request.calendarColour ?? null,
    })) as JobAssignment[];
  },
};
