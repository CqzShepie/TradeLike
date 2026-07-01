import { apiClient } from "./apiClient";

export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export type StaffLeaveRequest = {
  id: number;
  staffMemberId: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
  updatedAt?: string | null;
};

export type CreateStaffLeaveRequest = {
  staffMemberId: number;
  startDate: string;
  endDate: string;
  reason?: string;
};

export const staffLeaveService = {
  async getAll() {
    return (await apiClient.get("/staff/leave-requests")) as StaffLeaveRequest[];
  },

  async create(request: CreateStaffLeaveRequest) {
    return (await apiClient.post("/staff/leave-requests", {
      staffMemberId: request.staffMemberId,
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason?.trim() ?? "",
    })) as StaffLeaveRequest;
  },

  async updateStatus(id: number, status: LeaveStatus) {
    return (await apiClient.put(`/staff/leave-requests/${id}`, { status })) as StaffLeaveRequest;
  },
};
