import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import { customerStaffService } from "../services/customerStaffService";
import type { CustomerStaffMember, CustomerStaffWorkspace, CustomerTeam } from "../services/customerStaffService";
import { staffLeaveService } from "../services/staffLeaveService";
import type { LeaveStatus, LeaveType, StaffLeaveRequest } from "../services/staffLeaveService";
import { formatPhone, formatShortDate } from "../utils/inputFormatters";
import { getTeamColour, getTeamColourLabel, teamColours } from "../utils/teamColours";

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

const statuses: CustomerStaffMember["status"][] = ["InvitePending", "Active", "Suspended", "Left", "Cancelled"];
type Tab = "staff" | "teams" | "leave";

export default function CustomerStaff() {
  const location = useLocation();
  const [workspace, setWorkspace] = useState<CustomerStaffWorkspace>(blankWorkspace);
  const [activeTab, setActiveTab] = useState<Tab>(() => location.pathname === "/leave" ? "leave" : "staff");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamColour, setTeamColour] = useState("blue");
  const [teamDefaultJobType, setTeamDefaultJobType] = useState("");
  const [teamServiceArea, setTeamServiceArea] = useState("");
  const [teamWorkingHours, setTeamWorkingHours] = useState("");
  const [memberFirstName, setMemberFirstName] = useState("");
  const [memberLastName, setMemberLastName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberRole, setMemberRole] = useState("Engineer");
  const [memberTeamIds, setMemberTeamIds] = useState<number[]>([]);
  const [memberSkills, setMemberSkills] = useState("");
  const [memberServiceArea, setMemberServiceArea] = useState("");
  const [memberWorkingHours, setMemberWorkingHours] = useState("");
  const [memberColour, setMemberColour] = useState("blue");
  const [leaveRequests, setLeaveRequests] = useState<StaffLeaveRequest[]>([]);
  const [leaveStaffId, setLeaveStaffId] = useState("");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType>("Paid");
  const [leaveDecisionNote, setLeaveDecisionNote] = useState("");

  useEffect(() => {
    void loadWorkspace();
    void loadLeaveRequests();
  }, []);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return workspace.members;

    return workspace.members.filter(member =>
      [member.firstName, member.lastName, member.email, member.roleName, member.status, member.skills, member.serviceArea]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [workspace.members, search]);

  const currentUserCount = workspace.members.filter(member => member.status !== "Left" && member.status !== "Cancelled").length;
  const maxUsers = workspace.entitlements.maxUsers;
  const userLimitReached = maxUsers != null && currentUserCount >= maxUsers;
  const selectedMember = selectedMemberId ? workspace.members.find(member => member.id === selectedMemberId) : null;
  const selectedTeam = selectedTeamId ? workspace.teams.find(team => team.id === selectedTeamId) : null;

  async function loadWorkspace() {
    try {
      setLoading(true);
      setError("");
      setWorkspace(await customerStaffService.getWorkspace());
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load staff and teams."));
    } finally {
      setLoading(false);
    }
  }

  async function loadLeaveRequests() {
    try {
      setLeaveRequests(await staffLeaveService.getAll());
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load annual leave."));
    }
  }

  function clearTeamForm() {
    setEditingTeamId(null);
    setTeamName("");
    setTeamDescription("");
    setTeamColour("blue");
    setTeamDefaultJobType("");
    setTeamServiceArea("");
    setTeamWorkingHours("");
  }

  function startEditTeam(team: CustomerTeam) {
    setEditingTeamId(team.id);
    setTeamName(team.name);
    setTeamDescription(team.description);
    setTeamColour(team.colour || "blue");
    setTeamDefaultJobType(team.defaultJobType);
    setTeamServiceArea(team.serviceArea);
    setTeamWorkingHours(team.workingHours);
    setActiveTab("teams");
    setSelectedTeamId(team.id);
    setError("");
    setMessage(`Editing ${team.name}.`);
  }

  async function saveTeam() {
    if (!workspace.entitlements.teamsEnabled) {
      setError("Upgrade to Team or above to create and edit teams.");
      return;
    }

    if (teamName.trim() === "") {
      setError("Team name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const request = {
        name: teamName,
        description: teamDescription,
        colour: teamColour,
        defaultJobType: teamDefaultJobType,
        serviceArea: teamServiceArea,
        workingHours: teamWorkingHours,
      };
      const updatedWorkspace = editingTeamId
        ? await customerStaffService.updateTeam(editingTeamId, request)
        : await customerStaffService.createTeam(request);

      setWorkspace(updatedWorkspace);
      setMessage(editingTeamId ? "Team updated." : "Team created.");
      clearTeamForm();
    } catch (err) {
      setError(getErrorMessage(err, editingTeamId ? "Unable to update team." : "Unable to create team."));
    } finally {
      setSaving(false);
    }
  }

  async function inviteMember() {
    if (userLimitReached) {
      setError(`Your ${workspace.entitlements.planName} plan allows ${maxUsers} user${maxUsers === 1 ? "" : "s"}. Upgrade to invite more staff.`);
      return;
    }

    if (memberFirstName.trim() === "" || memberLastName.trim() === "" || !memberEmail.includes("@")) {
      setError("First name, last name and a valid email are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await customerStaffService.createMember({
        firstName: memberFirstName,
        lastName: memberLastName,
        email: memberEmail,
        phone: formatPhone(memberPhone),
        roleName: memberRole,
        permissionPresetName: memberRole,
        teamIds: memberTeamIds,
        skills: memberSkills,
        serviceArea: memberServiceArea,
        workingHours: memberWorkingHours,
        calendarColour: memberColour,
      });

      setWorkspace(response.workspace);
      setMemberFirstName("");
      setMemberLastName("");
      setMemberEmail("");
      setMemberPhone("");
      setMemberTeamIds([]);
      setMemberSkills("");
      setMemberServiceArea("");
      setMemberWorkingHours("");
      setMessage(`Invite created. Link: ${response.inviteLink}`);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to invite staff member."));
    } finally {
      setSaving(false);
    }
  }

  async function updateMember(member: CustomerStaffMember, patch: Partial<CustomerStaffMember>) {
    try {
      setSaving(true);
      setError("");
      const updated = { ...member, ...patch };
      setWorkspace(await customerStaffService.updateMember(member.id, {
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: formatPhone(updated.phone),
        roleName: updated.roleName,
        status: updated.status,
        permissionPresetName: updated.permissionPresetName,
        teamIds: updated.teamIds,
        skills: updated.skills,
        serviceArea: updated.serviceArea,
        workingHours: updated.workingHours,
        calendarColour: updated.calendarColour,
        isTwoFactorRequired: updated.isTwoFactorRequired,
      }));
      setMessage("Staff member updated.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update staff member."));
    } finally {
      setSaving(false);
    }
  }

  async function requestPasswordReset(member: CustomerStaffMember) {
    try {
      setSaving(true);
      setError("");
      setWorkspace(await customerStaffService.requestPasswordReset(member.id));
      setMessage(`Password reset request recorded for ${member.email}.`);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to request password reset."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTeam(team: CustomerTeam) {
    if (!confirm(`Delete ${team.name}? Staff will remain but the team grouping will be removed.`)) return;

    try {
      setSaving(true);
      setError("");
      setWorkspace(await customerStaffService.deleteTeam(team.id));
      if (editingTeamId === team.id) clearTeamForm();
      if (selectedTeamId === team.id) setSelectedTeamId(null);
      setMessage("Team deleted.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete team."));
    } finally {
      setSaving(false);
    }
  }

  async function addLeaveRequest() {
    const staffId = Number(leaveStaffId || selectedMemberId || 0);
    if (!staffId || !leaveStartDate || !leaveEndDate) {
      setError("Choose a staff member and leave dates.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const request = await staffLeaveService.create({
        staffMemberId: staffId,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: leaveReason,
        leaveType,
      });
      setLeaveRequests(previous => [request, ...previous]);
      setLeaveStaffId("");
      setLeaveStartDate("");
      setLeaveEndDate("");
      setLeaveReason("");
      setLeaveType("Paid");
      setMessage("Annual leave request added.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to add annual leave."));
    } finally {
      setSaving(false);
    }
  }

  async function updateLeaveStatus(id: number, status: LeaveStatus) {
    try {
      setSaving(true);
      setError("");
      const note = leaveDecisionNote;
      const updated = status === "Approved"
        ? await staffLeaveService.approve(id, note)
        : status === "Rejected"
          ? await staffLeaveService.reject(id, note)
          : status === "Cancelled"
            ? await staffLeaveService.cancel(id, note)
            : await staffLeaveService.updateStatus(id, status, note);

      setLeaveRequests(requests => requests.map(request => request.id === id ? updated : request));
      setLeaveDecisionNote("");
      setMessage(`Leave request ${status.toLowerCase()}.`);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update annual leave."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <section className="min-w-0 flex-1 p-10">
        <div className="max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">Team operations</p>
              <h1 className="mt-1 text-3xl font-bold text-white">Staff & Teams</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Invite workers, build flexible teams, assign roles, plan job calendars, and keep customer company staff separate from TradeLike internal staff.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm shadow-sm">
              <p className="font-bold text-white">{workspace.entitlements.planName} plan</p>
              <p className="mt-1 text-slate-300">{maxUsers == null ? "Unlimited users" : `${currentUserCount}/${maxUsers} users`}</p>
              <p className="text-slate-300">Support: {workspace.entitlements.supportLevel}</p>
            </div>
          </div>

          {error && <Alert tone="error" onClose={() => setError("")}>{error}</Alert>}
          {message && <Alert tone="success" onClose={() => setMessage("")}>{message}</Alert>}

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <TabButton active={activeTab === "staff"} onClick={() => setActiveTab("staff")}>Staff</TabButton>
            <TabButton active={activeTab === "teams"} onClick={() => setActiveTab("teams")}>Teams</TabButton>
            <TabButton active={activeTab === "leave"} onClick={() => setActiveTab("leave")}>Annual leave</TabButton>
          </div>

          {loading ? (
            <p className="mt-8 text-sm text-slate-400">Loading...</p>
          ) : (
            <div className="mt-6">
              {activeTab === "staff" && (
                <StaffTab
                  workspace={workspace}
                  userLimitReached={userLimitReached}
                  saving={saving}
                  memberForm={{
                    memberFirstName,
                    setMemberFirstName,
                    memberLastName,
                    setMemberLastName,
                    memberEmail,
                    setMemberEmail,
                    memberPhone,
                    setMemberPhone,
                    memberRole,
                    setMemberRole,
                    memberTeamIds,
                    setMemberTeamIds,
                    memberSkills,
                    setMemberSkills,
                    memberServiceArea,
                    setMemberServiceArea,
                    memberWorkingHours,
                    setMemberWorkingHours,
                    memberColour,
                    setMemberColour,
                  }}
                  search={search}
                  setSearch={setSearch}
                  filteredMembers={filteredMembers}
                  leaveRequests={leaveRequests}
                  selectedMember={selectedMember}
                  selectedMemberId={selectedMemberId}
                  setSelectedMemberId={setSelectedMemberId}
                  inviteMember={inviteMember}
                  updateMember={updateMember}
                  requestPasswordReset={requestPasswordReset}
                />
              )}
              {activeTab === "teams" && (
                <TeamsTab
                  workspace={workspace}
                  saving={saving}
                  editingTeamId={editingTeamId}
                  teamName={teamName}
                  setTeamName={setTeamName}
                  teamDescription={teamDescription}
                  setTeamDescription={setTeamDescription}
                  teamColour={teamColour}
                  setTeamColour={setTeamColour}
                  teamDefaultJobType={teamDefaultJobType}
                  setTeamDefaultJobType={setTeamDefaultJobType}
                  teamServiceArea={teamServiceArea}
                  setTeamServiceArea={setTeamServiceArea}
                  teamWorkingHours={teamWorkingHours}
                  setTeamWorkingHours={setTeamWorkingHours}
                  saveTeam={saveTeam}
                  clearTeamForm={clearTeamForm}
                  selectedTeam={selectedTeam}
                  selectedTeamId={selectedTeamId}
                  setSelectedTeamId={setSelectedTeamId}
                  startEditTeam={startEditTeam}
                  deleteTeam={deleteTeam}
                />
              )}
              {activeTab === "leave" && (
                <LeaveTab
                  workspace={workspace}
                  selectedMemberId={selectedMemberId}
                  saving={saving}
                  leaveRequests={leaveRequests}
                  leaveStaffId={leaveStaffId}
                  setLeaveStaffId={setLeaveStaffId}
                  leaveType={leaveType}
                  setLeaveType={setLeaveType}
                  leaveStartDate={leaveStartDate}
                  setLeaveStartDate={setLeaveStartDate}
                  leaveEndDate={leaveEndDate}
                  setLeaveEndDate={setLeaveEndDate}
                  leaveReason={leaveReason}
                  setLeaveReason={setLeaveReason}
                  leaveDecisionNote={leaveDecisionNote}
                  setLeaveDecisionNote={setLeaveDecisionNote}
                  addLeaveRequest={addLeaveRequest}
                  updateLeaveStatus={updateLeaveStatus}
                />
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

type StaffFormState = {
  memberFirstName: string;
  setMemberFirstName: (value: string) => void;
  memberLastName: string;
  setMemberLastName: (value: string) => void;
  memberEmail: string;
  setMemberEmail: (value: string) => void;
  memberPhone: string;
  setMemberPhone: (value: string) => void;
  memberRole: string;
  setMemberRole: (value: string) => void;
  memberTeamIds: number[];
  setMemberTeamIds: (ids: number[]) => void;
  memberSkills: string;
  setMemberSkills: (value: string) => void;
  memberServiceArea: string;
  setMemberServiceArea: (value: string) => void;
  memberWorkingHours: string;
  setMemberWorkingHours: (value: string) => void;
  memberColour: string;
  setMemberColour: (value: string) => void;
};

function StaffTab({
  workspace,
  userLimitReached,
  saving,
  memberForm,
  search,
  setSearch,
  filteredMembers,
  leaveRequests,
  selectedMember,
  selectedMemberId,
  setSelectedMemberId,
  inviteMember,
  updateMember,
  requestPasswordReset,
}: {
  workspace: CustomerStaffWorkspace;
  userLimitReached: boolean;
  saving: boolean;
  memberForm: StaffFormState;
  search: string;
  setSearch: (value: string) => void;
  filteredMembers: CustomerStaffMember[];
  leaveRequests: StaffLeaveRequest[];
  selectedMember: CustomerStaffMember | null | undefined;
  selectedMemberId: number | null;
  setSelectedMemberId: (value: number | null) => void;
  inviteMember: () => void;
  updateMember: (member: CustomerStaffMember, patch: Partial<CustomerStaffMember>) => void;
  requestPasswordReset: (member: CustomerStaffMember) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Panel title="Invite worker">
        {userLimitReached && (
          <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            User limit reached. Upgrade to add more workers.
          </div>
        )}
        <div className="grid gap-3">
          <Input placeholder="First name" value={memberForm.memberFirstName} onChange={memberForm.setMemberFirstName} />
          <Input placeholder="Last name" value={memberForm.memberLastName} onChange={memberForm.setMemberLastName} />
          <Input placeholder="Email" value={memberForm.memberEmail} onChange={memberForm.setMemberEmail} />
          <Input placeholder="Phone" value={memberForm.memberPhone} onChange={value => memberForm.setMemberPhone(formatPhone(value))} />
          <Select value={memberForm.memberRole} onChange={memberForm.setMemberRole}>
            {workspace.roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
          </Select>
          <TeamPicker teams={workspace.teams} selectedIds={memberForm.memberTeamIds} onChange={memberForm.setMemberTeamIds} />
          <Input placeholder="Skills e.g. gas safe, installs, servicing" value={memberForm.memberSkills} onChange={memberForm.setMemberSkills} />
          <Input placeholder="Service area / postcode coverage" value={memberForm.memberServiceArea} onChange={memberForm.setMemberServiceArea} />
          <Input placeholder="Working hours e.g. Mon-Fri 8-5" value={memberForm.memberWorkingHours} onChange={memberForm.setMemberWorkingHours} />
          <Select value={memberForm.memberColour} onChange={memberForm.setMemberColour}>
            {teamColours.map(colour => <option key={colour.value} value={colour.value}>{colour.label}</option>)}
          </Select>
          <button type="button" disabled={saving || userLimitReached} onClick={inviteMember} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700">
            {saving ? "Saving..." : "Invite worker"}
          </button>
        </div>
      </Panel>

      <Panel title="Company staff">
        <Input placeholder="Search staff, role, skills, area..." value={search} onChange={setSearch} />
        <div className="mt-4 grid gap-3">
          {filteredMembers.map(member => (
            <StaffCard
              key={member.id}
              member={member}
              teams={workspace.teams}
              leaveRequests={leaveRequests}
              selected={selectedMemberId === member.id}
              onSelect={() => setSelectedMemberId(selectedMemberId === member.id ? null : member.id)}
              onPasswordReset={() => requestPasswordReset(member)}
              onStatusChange={status => updateMember(member, { status })}
              onRoleChange={role => updateMember(member, { roleName: role, permissionPresetName: role })}
              onTeamsChange={teamIds => updateMember(member, { teamIds })}
              roleOptions={workspace.roleOptions}
            />
          ))}
          {filteredMembers.length === 0 && <p className="text-sm text-slate-400">No staff found.</p>}
        </div>
        {selectedMember && (
          <DetailBox
            title={`${selectedMember.firstName} ${selectedMember.lastName}`}
            items={[
              `Role: ${selectedMember.roleName}`,
              `Status: ${selectedMember.status}`,
              `Email: ${selectedMember.email}`,
              `Phone: ${selectedMember.phone || "Not set"}`,
              `Working hours: ${selectedMember.workingHours || "Not set"}`,
              `Upcoming leave: ${formatLeaveSummary(nextLeaveForMember(leaveRequests, selectedMember.id))}`,
            ]}
          />
        )}
      </Panel>
    </div>
  );
}

function TeamsTab({
  workspace,
  saving,
  editingTeamId,
  teamName,
  setTeamName,
  teamDescription,
  setTeamDescription,
  teamColour,
  setTeamColour,
  teamDefaultJobType,
  setTeamDefaultJobType,
  teamServiceArea,
  setTeamServiceArea,
  teamWorkingHours,
  setTeamWorkingHours,
  saveTeam,
  clearTeamForm,
  selectedTeam,
  selectedTeamId,
  setSelectedTeamId,
  startEditTeam,
  deleteTeam,
}: {
  workspace: CustomerStaffWorkspace;
  saving: boolean;
  editingTeamId: number | null;
  teamName: string;
  setTeamName: (value: string) => void;
  teamDescription: string;
  setTeamDescription: (value: string) => void;
  teamColour: string;
  setTeamColour: (value: string) => void;
  teamDefaultJobType: string;
  setTeamDefaultJobType: (value: string) => void;
  teamServiceArea: string;
  setTeamServiceArea: (value: string) => void;
  teamWorkingHours: string;
  setTeamWorkingHours: (value: string) => void;
  saveTeam: () => void;
  clearTeamForm: () => void;
  selectedTeam?: CustomerTeam | null;
  selectedTeamId: number | null;
  setSelectedTeamId: (value: number | null) => void;
  startEditTeam: (team: CustomerTeam) => void;
  deleteTeam: (team: CustomerTeam) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Panel title={editingTeamId ? "Edit team" : "Create team"}>
        {!workspace.entitlements.teamsEnabled && (
          <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            Teams unlock on Team, Business, and Enterprise.
          </div>
        )}
        {editingTeamId && (
          <div className="mb-4 rounded-lg border border-blue-400/30 bg-blue-500/10 p-3 text-sm font-semibold text-blue-100">
            Editing an existing team. Save to update it or cancel to create a new one.
          </div>
        )}
        <div className="grid gap-3">
          <Input placeholder="Team name" value={teamName} onChange={setTeamName} />
          <Input placeholder="Description" value={teamDescription} onChange={setTeamDescription} />
          <Select value={teamColour} onChange={setTeamColour}>
            {teamColours.map(colour => <option key={colour.value} value={colour.value}>{colour.label}</option>)}
          </Select>
          <Input placeholder="Default job type" value={teamDefaultJobType} onChange={setTeamDefaultJobType} />
          <Input placeholder="Service area" value={teamServiceArea} onChange={setTeamServiceArea} />
          <Input placeholder="Working hours" value={teamWorkingHours} onChange={setTeamWorkingHours} />
          <button type="button" disabled={saving || !workspace.entitlements.teamsEnabled} onClick={saveTeam} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700">
            {saving ? "Saving..." : editingTeamId ? "Save team" : "Create team"}
          </button>
          {editingTeamId && (
            <button type="button" onClick={clearTeamForm} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">
              Cancel edit
            </button>
          )}
        </div>
      </Panel>

      <Panel title="Teams">
        <div className="grid gap-3 md:grid-cols-2">
          {workspace.teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              members={workspace.members.filter(member => member.teamIds.includes(team.id))}
              selected={selectedTeamId === team.id}
              onSelect={() => setSelectedTeamId(selectedTeamId === team.id ? null : team.id)}
              onDelete={() => deleteTeam(team)}
              onEdit={() => startEditTeam(team)}
            />
          ))}
        </div>
        {selectedTeam && (
          <DetailBox
            title={selectedTeam.name}
            items={[
              `Colour: ${getTeamColourLabel(selectedTeam.colour)}`,
              `Area: ${selectedTeam.serviceArea || "Not set"}`,
              `Hours: ${selectedTeam.workingHours || "Not set"}`,
              `Default job type: ${selectedTeam.defaultJobType || "Not set"}`,
              `Members: ${workspace.members.filter(member => member.teamIds.includes(selectedTeam.id)).map(member => `${member.firstName} ${member.lastName}`).join(", ") || "None"}`,
            ]}
          />
        )}
      </Panel>
    </div>
  );
}

function LeaveTab({
  workspace,
  selectedMemberId,
  saving,
  leaveRequests,
  leaveStaffId,
  setLeaveStaffId,
  leaveType,
  setLeaveType,
  leaveStartDate,
  setLeaveStartDate,
  leaveEndDate,
  setLeaveEndDate,
  leaveReason,
  setLeaveReason,
  leaveDecisionNote,
  setLeaveDecisionNote,
  addLeaveRequest,
  updateLeaveStatus,
}: {
  workspace: CustomerStaffWorkspace;
  selectedMemberId: number | null;
  saving: boolean;
  leaveRequests: StaffLeaveRequest[];
  leaveStaffId: string;
  setLeaveStaffId: (value: string) => void;
  leaveType: LeaveType;
  setLeaveType: (value: LeaveType) => void;
  leaveStartDate: string;
  setLeaveStartDate: (value: string) => void;
  leaveEndDate: string;
  setLeaveEndDate: (value: string) => void;
  leaveReason: string;
  setLeaveReason: (value: string) => void;
  leaveDecisionNote: string;
  setLeaveDecisionNote: (value: string) => void;
  addLeaveRequest: () => void;
  updateLeaveStatus: (id: number, status: LeaveStatus) => void;
}) {
  return (
    <Panel title="Annual leave">
      <div className="grid gap-3 md:grid-cols-6">
        <Select value={leaveStaffId || String(selectedMemberId ?? "")} onChange={setLeaveStaffId}>
          <option value="">Choose staff</option>
          {workspace.members
            .filter(member => member.status !== "Left" && member.status !== "Cancelled")
            .map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}
        </Select>
        <Select value={leaveType} onChange={value => setLeaveType(value as LeaveType)}>
          <option value="Paid">Paid leave</option>
          <option value="Unpaid">Unpaid leave</option>
        </Select>
        <Input type="date" placeholder="Start" value={leaveStartDate} onChange={setLeaveStartDate} />
        <Input type="date" placeholder="End" value={leaveEndDate} onChange={setLeaveEndDate} />
        <Input placeholder="Reason" value={leaveReason} onChange={setLeaveReason} />
        <button type="button" onClick={addLeaveRequest} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          Add leave
        </button>
      </div>

      <div className="mt-4">
        <Input placeholder="Manager note for approve/reject/cancel" value={leaveDecisionNote} onChange={setLeaveDecisionNote} />
      </div>

      <div className="mt-5 grid gap-3">
        {leaveRequests.map(request => {
          const member = workspace.members.find(item => item.id === request.staffMemberId);

          return (
            <div key={request.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{member ? `${member.firstName} ${member.lastName}` : "Unknown staff"}</p>
                  <p className="text-sm text-slate-300">
                    {formatShortDate(request.startDate)} to {formatShortDate(request.endDate)} - {request.reason || "Annual leave"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-blue-300">{request.leaveType ?? "Paid"} - {request.status}</p>
                  {request.decisionNote && <p className="mt-1 text-xs text-slate-400">Manager note: {request.decisionNote}</p>}
                  {request.decidedAt && <p className="mt-1 text-xs text-slate-500">Updated {formatShortDate(request.decidedAt)}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <LeaveActionButton disabled={saving || request.status === "Approved"} tone="approve" onClick={() => updateLeaveStatus(request.id, "Approved")}>
                    Approve
                  </LeaveActionButton>
                  <LeaveActionButton disabled={saving || request.status === "Rejected"} tone="reject" onClick={() => updateLeaveStatus(request.id, "Rejected")}>
                    Reject
                  </LeaveActionButton>
                  <LeaveActionButton disabled={saving || request.status === "Cancelled"} tone="cancel" onClick={() => updateLeaveStatus(request.id, "Cancelled")}>
                    Cancel
                  </LeaveActionButton>
                </div>
              </div>
            </div>
          );
        })}
        {leaveRequests.length === 0 && (
          <p className="rounded-lg border border-dashed border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
            No annual leave booked yet.
          </p>
        )}
      </div>
    </Panel>
  );
}

function LeaveActionButton({ children, tone, disabled, onClick }: { children: ReactNode; tone: "approve" | "reject" | "cancel"; disabled: boolean; onClick: () => void }) {
  const toneClass = tone === "approve"
    ? "border-green-400/30 text-green-200 hover:bg-green-500/10"
    : tone === "reject"
      ? "border-red-400/30 text-red-200 hover:bg-red-500/10"
      : "border-white/10 text-slate-200 hover:bg-white/10";

  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}>
      {children}
    </button>
  );
}

function StaffCard({
  member,
  teams,
  leaveRequests,
  selected,
  onSelect,
  onPasswordReset,
  onStatusChange,
  onRoleChange,
  onTeamsChange,
  roleOptions,
}: {
  member: CustomerStaffMember;
  teams: CustomerTeam[];
  leaveRequests: StaffLeaveRequest[];
  selected: boolean;
  onSelect: () => void;
  onPasswordReset: () => void;
  onStatusChange: (status: CustomerStaffMember["status"]) => void;
  onRoleChange: (role: string) => void;
  onTeamsChange: (ids: number[]) => void;
  roleOptions: string[];
}) {
  const leave = nextLeaveForMember(leaveRequests, member.id);
  const statusOptions = member.status === "InvitePending" && !member.inviteAcceptedAt
    ? statuses.filter(status => status === "InvitePending" || status === "Cancelled")
    : statuses.filter(status => status !== "InvitePending");

  return (
    <div onClick={onSelect} className={`cursor-pointer rounded-xl border p-4 transition ${selected ? "border-blue-400 bg-blue-500/10" : "border-white/10 bg-slate-950/50 hover:bg-white/10"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-white">{member.firstName} {member.lastName}</p>
          <p className="text-sm text-slate-300">{member.email}</p>
          <p className="mt-1 text-xs font-semibold text-blue-300">{member.roleName} - {member.status}</p>
          {member.status === "InvitePending" && <p className="mt-1 text-xs text-amber-200">Waiting for invite acceptance.</p>}
          {leave && <p className="mt-1 text-xs font-semibold text-amber-300">Leave: {formatShortDate(leave.startDate)} to {formatShortDate(leave.endDate)} ({leave.status})</p>}
        </div>
        <div className="flex flex-wrap gap-2" onClick={event => event.stopPropagation()}>
          <button type="button" onClick={onPasswordReset} className="rounded-lg border border-white/10 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-white/10">
            Reset password
          </button>
          <Select value={member.status} onChange={value => onStatusChange(value as CustomerStaffMember["status"])}>
            {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
          </Select>
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2" onClick={event => event.stopPropagation()}>
        <Select value={member.roleName} onChange={onRoleChange}>
          {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
        </Select>
        <TeamPicker teams={teams} selectedIds={member.teamIds} onChange={onTeamsChange} compact />
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-3">
        <span>Skills: {member.skills || "Not set"}</span>
        <span>Area: {member.serviceArea || "Not set"}</span>
        <span>Reset: {member.resetPasswordRequestedAt ? formatShortDate(member.resetPasswordRequestedAt) : "No request"}</span>
      </div>
    </div>
  );
}

function TeamCard({ team, members, selected, onSelect, onDelete, onEdit }: { team: CustomerTeam; members: CustomerStaffMember[]; selected: boolean; onSelect: () => void; onDelete: () => void; onEdit: () => void }) {
  const colour = getTeamColour(team.colour);

  return (
    <div onClick={onSelect} className={`cursor-pointer rounded-xl border p-4 transition ${selected ? "ring-2 ring-blue-400" : ""}`} style={{ borderColor: colour.hex, backgroundColor: colour.softHex }}>
      <div className="flex justify-between gap-4">
        <div>
          <p className="font-bold text-slate-900">{team.name}</p>
          <p className="text-sm text-slate-600">{team.description || "No description"}</p>
          <p className="mt-1 text-xs font-bold" style={{ color: colour.hex }}>{colour.label}</p>
        </div>
        <div className="flex flex-col gap-2" onClick={event => event.stopPropagation()}>
          <button type="button" onClick={onDelete} className="h-fit rounded border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
          <button type="button" onClick={onEdit} className="h-fit rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-600">
        <p>{members.length} member{members.length === 1 ? "" : "s"}</p>
        <p>Area: {team.serviceArea || "Not set"}</p>
        <p>Hours: {team.workingHours || "Not set"}</p>
      </div>
    </div>
  );
}

function DetailBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4 rounded-xl border border-blue-400/30 bg-blue-500/10 p-4">
      <p className="font-bold text-white">{title}</p>
      <div className="mt-2 grid gap-1 text-sm text-slate-300">{items.map(item => <span key={item}>{item}</span>)}</div>
    </div>
  );
}

function TeamPicker({ teams, selectedIds, onChange, compact = false }: { teams: CustomerTeam[]; selectedIds: number[]; onChange: (ids: number[]) => void; compact?: boolean }) {
  if (teams.length === 0) {
    return <p className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-400">No teams yet.</p>;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "rounded-lg border border-white/10 p-3"}`}>
      {teams.map(team => (
        <button
          key={team.id}
          type="button"
          onClick={() => onChange(selectedIds.includes(team.id) ? selectedIds.filter(id => id !== team.id) : [...selectedIds, team.id])}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedIds.includes(team.id) ? "border-blue-500 bg-blue-600 text-white" : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"}`}
        >
          {team.name}
        </button>
      ))}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/20">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left text-sm font-bold ${active ? "border-blue-400/40 bg-blue-600 text-white" : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"}`}>
      {children}
    </button>
  );
}

function Alert({ tone, children, onClose }: { tone: "error" | "success"; children: ReactNode; onClose: () => void }) {
  return (
    <div className={`mt-6 flex items-start justify-between gap-4 rounded-xl border p-4 text-sm font-semibold ${tone === "error" ? "border-red-400/30 bg-red-950/30 text-red-100" : "border-green-400/30 bg-green-950/30 text-green-100"}`}>
      <span>{children}</span>
      <button type="button" onClick={onClose} className="rounded px-2 text-lg leading-none hover:bg-white/10">x</button>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
    />
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40">
      {children}
    </select>
  );
}

function nextLeaveForMember(requests: StaffLeaveRequest[], staffMemberId: number) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return requests
    .filter(request => request.staffMemberId === staffMemberId && request.status !== "Rejected" && request.status !== "Cancelled" && new Date(request.endDate) >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
}

function formatLeaveSummary(request?: StaffLeaveRequest) {
  return request ? `${formatShortDate(request.startDate)} to ${formatShortDate(request.endDate)} (${request.status})` : "None";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== "" ? error.message : fallback;
}
