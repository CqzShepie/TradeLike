import { apiClient } from "./apiClient";

export type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";
export type LeaveType = "Paid" | "Unpaid";

export type StaffLeaveRequest = {
  id: number;
  staffMemberId: number;
  startDate: string;
  endDate: string;
  reason: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  decisionNote: string;
  decidedByUserId?: number | null;
  decidedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type CreateStaffLeaveRequest = {
  staffMemberId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  leaveType?: LeaveType;
};

export const staffLeaveService = {
  async getAll() {
    return (await apiClient.get("/team/leave-requests")) as StaffLeaveRequest[];
  },

  async create(request: CreateStaffLeaveRequest) {
    return (await apiClient.post("/team/leave-requests", {
      staffMemberId: request.staffMemberId,
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason?.trim() ?? "",
      leaveType: request.leaveType ?? "Paid",
    })) as StaffLeaveRequest;
  },

  async updateStatus(id: number, status: LeaveStatus, note = "") {
    return (await apiClient.put(`/team/leave-requests/${id}`, { status, decisionNote: note.trim() })) as StaffLeaveRequest;
  },

  async approve(id: number, note = "") {
    return (await apiClient.post(`/team/leave-requests/${id}/approve`, { note: note.trim() })) as StaffLeaveRequest;
  },

  async reject(id: number, note = "") {
    return (await apiClient.post(`/team/leave-requests/${id}/reject`, { note: note.trim() })) as StaffLeaveRequest;
  },

  async cancel(id: number, note = "") {
    return (await apiClient.post(`/team/leave-requests/${id}/cancel`, { note: note.trim() })) as StaffLeaveRequest;
  },
};
