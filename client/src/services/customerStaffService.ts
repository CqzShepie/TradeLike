import { apiClient } from "./apiClient";

export type CustomerTeam = {
  id: number;
  name: string;
  description: string;
  colour: string;
  teamLeadStaffId?: number | null;
  defaultJobType: string;
  serviceArea: string;
  workingHours: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type CustomerStaffMember = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleName: string;
  status: "InvitePending" | "Active" | "Suspended" | "Left" | "Cancelled";
  permissionPresetName: string;
  skills: string;
  serviceArea: string;
  workingHours: string;
  calendarColour: string;
  isTwoFactorRequired: boolean;
  teamIds: number[];
  lastLoginAt?: string | null;
  inviteSentAt?: string | null;
  inviteAcceptedAt?: string | null;
  resetPasswordRequestedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type PlanEntitlements = {
  planName: string;
  maxUsers?: number | null;
  teamsEnabled: boolean;
  staffSchedulingEnabled: boolean;
  advancedPermissionsEnabled: boolean;
  reportingEnabled: boolean;
  apiAccessEnabled: boolean;
  supportLevel: string;
};

export type CustomerStaffWorkspace = {
  teams: CustomerTeam[];
  members: CustomerStaffMember[];
  entitlements: PlanEntitlements;
  roleOptions: string[];
  futureSecurityItems: string[];
  qualityOfLifeItems: string[];
};

export type CreateCustomerTeamRequest = {
  name: string;
  description?: string;
  colour?: string;
  teamLeadStaffId?: number | null;
  defaultJobType?: string;
  serviceArea?: string;
  workingHours?: string;
};

export type CreateCustomerStaffMemberRequest = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roleName: string;
  permissionPresetName?: string;
  teamIds: number[];
  skills?: string;
  serviceArea?: string;
  workingHours?: string;
  calendarColour?: string;
};

export type UpdateCustomerStaffMemberRequest = CreateCustomerStaffMemberRequest & {
  status: CustomerStaffMember["status"];
  isTwoFactorRequired: boolean;
};

export const customerStaffService = {
  async getWorkspace() {
    return (await apiClient.get("/customer-staff")) as CustomerStaffWorkspace;
  },

  async createTeam(request: CreateCustomerTeamRequest) {
    return (await apiClient.post("/customer-staff/teams", cleanTeam(request))) as CustomerStaffWorkspace;
  },

  async updateTeam(teamId: number, request: CreateCustomerTeamRequest) {
    await apiClient.put(`/customer-staff/teams/${teamId}`, cleanTeam(request));
    return this.getWorkspace();
  },

  async deleteTeam(teamId: number) {
    return (await apiClient.delete(`/customer-staff/teams/${teamId}`)) as CustomerStaffWorkspace;
  },

  async createMember(request: CreateCustomerStaffMemberRequest) {
    return (await apiClient.post("/customer-staff/members", cleanMember(request))) as {
      workspace: CustomerStaffWorkspace;
      inviteLink: string;
    };
  },

  async updateMember(memberId: number, request: UpdateCustomerStaffMemberRequest) {
    return (await apiClient.put(`/customer-staff/members/${memberId}`, {
      ...cleanMember(request),
      status: request.status,
      isTwoFactorRequired: request.isTwoFactorRequired,
    })) as CustomerStaffWorkspace;
  },

  async requestPasswordReset(memberId: number) {
    return (await apiClient.post(`/customer-staff/members/${memberId}/reset-password`, {})) as CustomerStaffWorkspace;
  },
};

function cleanTeam(request: CreateCustomerTeamRequest) {
  return {
    name: request.name.trim(),
    description: request.description?.trim() ?? "",
    colour: request.colour?.trim() ?? "blue",
    teamLeadStaffId: request.teamLeadStaffId ?? null,
    defaultJobType: request.defaultJobType?.trim() ?? "",
    serviceArea: request.serviceArea?.trim() ?? "",
    workingHours: request.workingHours?.trim() ?? "",
  };
}

function cleanMember(request: CreateCustomerStaffMemberRequest) {
  return {
    firstName: request.firstName.trim(),
    lastName: request.lastName.trim(),
    email: request.email.trim().toLowerCase(),
    phone: request.phone?.trim() ?? "",
    roleName: request.roleName,
    permissionPresetName: request.permissionPresetName?.trim() || request.roleName,
    teamIds: request.teamIds,
    skills: request.skills?.trim() ?? "",
    serviceArea: request.serviceArea?.trim() ?? "",
    workingHours: request.workingHours?.trim() ?? "",
    calendarColour: request.calendarColour?.trim() ?? "blue",
  };
}
