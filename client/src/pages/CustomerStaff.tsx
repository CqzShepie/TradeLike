import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import { customerStaffService } from "../services/customerStaffService";
import type { CustomerStaffMember, CustomerStaffWorkspace, CustomerTeam } from "../services/customerStaffService";

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

const colours = ["blue", "green", "purple", "amber", "red", "slate"];
const statuses: CustomerStaffMember["status"][] = ["InvitePending", "Active", "Suspended", "Left"];

type Tab = "staff" | "teams" | "roles" | "plan" | "future";

export default function CustomerStaff() {
  const [workspace, setWorkspace] = useState<CustomerStaffWorkspace>(blankWorkspace);
  const [activeTab, setActiveTab] = useState<Tab>("staff");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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

  useEffect(() => {
    loadWorkspace();
  }, []);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return workspace.members;
    return workspace.members.filter(member => [
      member.firstName,
      member.lastName,
      member.email,
      member.roleName,
      member.status,
      member.skills,
      member.serviceArea,
    ].join(" ").toLowerCase().includes(query));
  }, [workspace.members, search]);

  const currentUserCount = workspace.members.filter(member => member.status !== "Left").length;
  const maxUsers = workspace.entitlements.maxUsers;
  const userLimitReached = maxUsers != null && currentUserCount >= maxUsers;

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
        phone: memberPhone,
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
        phone: updated.phone,
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
      if (editingTeamId === team.id) {
        clearTeamForm();
      }
      setMessage("Team deleted.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete team."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <section className="min-w-0 flex-1 p-10">
        <div className="max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Customer staff</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">Staff & Teams</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Invite workers, build flexible teams, assign roles, plan job calendars, and keep customer company staff completely separate from TradeLike internal staff.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <p className="font-bold text-slate-900">{workspace.entitlements.planName} plan</p>
              <p className="mt-1 text-slate-600">{currentUserCount}/{maxUsers ?? "∞"} users</p>
              <p className="text-slate-600">Support: {workspace.entitlements.supportLevel}</p>
            </div>
          </div>

          {error && <Alert tone="error">{error}</Alert>}
          {message && <Alert tone="success">{message}</Alert>}

          <div className="mt-8 grid gap-3 md:grid-cols-5">
            <TabButton active={activeTab === "staff"} onClick={() => setActiveTab("staff")}>Staff</TabButton>
            <TabButton active={activeTab === "teams"} onClick={() => setActiveTab("teams")}>Teams</TabButton>
            <TabButton active={activeTab === "roles"} onClick={() => setActiveTab("roles")}>Roles</TabButton>
            <TabButton active={activeTab === "plan"} onClick={() => setActiveTab("plan")}>Plan gates</TabButton>
            <TabButton active={activeTab === "future"} onClick={() => setActiveTab("future")}>Future QOL</TabButton>
          </div>

          {loading ? <p className="mt-8 text-sm text-slate-500">Loading...</p> : (
            <div className="mt-6">
              {activeTab === "staff" && (
                <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
                  <Panel title="Invite worker">
                    {userLimitReached && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">User limit reached. Upgrade to add more workers.</div>}
                    <div className="grid gap-3">
                      <Input placeholder="First name" value={memberFirstName} onChange={setMemberFirstName} />
                      <Input placeholder="Last name" value={memberLastName} onChange={setMemberLastName} />
                      <Input placeholder="Email" value={memberEmail} onChange={setMemberEmail} />
                      <Input placeholder="Phone" value={memberPhone} onChange={setMemberPhone} />
                      <Select value={memberRole} onChange={setMemberRole}>{workspace.roleOptions.map(role => <option key={role} value={role}>{role}</option>)}</Select>
                      <TeamPicker teams={workspace.teams} selectedIds={memberTeamIds} onChange={setMemberTeamIds} />
                      <Input placeholder="Skills e.g. gas safe, installs, servicing" value={memberSkills} onChange={setMemberSkills} />
                      <Input placeholder="Service area / postcode coverage" value={memberServiceArea} onChange={setMemberServiceArea} />
                      <Input placeholder="Working hours e.g. Mon-Fri 8-5" value={memberWorkingHours} onChange={setMemberWorkingHours} />
                      <Select value={memberColour} onChange={setMemberColour}>{colours.map(colour => <option key={colour} value={colour}>{colour}</option>)}</Select>
                      <button type="button" disabled={saving || userLimitReached} onClick={inviteMember} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">{saving ? "Saving..." : "Invite worker"}</button>
                    </div>
                  </Panel>

                  <Panel title="Company staff">
                    <Input placeholder="Search staff, role, skills, area..." value={search} onChange={setSearch} />
                    <div className="mt-4 grid gap-3">
                      {filteredMembers.map(member => (
                        <div key={member.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-900">{member.firstName} {member.lastName}</p>
                              <p className="text-sm text-slate-600">{member.email}</p>
                              <p className="mt-1 text-xs font-semibold text-blue-700">{member.roleName} · {member.status}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => requestPasswordReset(member)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white">Reset password</button>
                              <Select value={member.status} onChange={value => updateMember(member, { status: value as CustomerStaffMember["status"] })}>{statuses.map(status => <option key={status} value={status}>{status}</option>)}</Select>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <Select value={member.roleName} onChange={value => updateMember(member, { roleName: value, permissionPresetName: value })}>{workspace.roleOptions.map(role => <option key={role} value={role}>{role}</option>)}</Select>
                            <TeamPicker teams={workspace.teams} selectedIds={member.teamIds} onChange={teamIds => updateMember(member, { teamIds })} compact />
                          </div>
                          <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-3">
                            <span>Skills: {member.skills || "Not set"}</span>
                            <span>Area: {member.serviceArea || "Not set"}</span>
                            <span>Reset: {member.resetPasswordRequestedAt ? formatDate(member.resetPasswordRequestedAt) : "No request"}</span>
                          </div>
                        </div>
                      ))}
                      {filteredMembers.length === 0 && <p className="text-sm text-slate-500">No staff found.</p>}
                    </div>
                  </Panel>
                </div>
              )}

              {activeTab === "teams" && (
                <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
                  <Panel title={editingTeamId ? "Edit team" : "Create team"}>
                    {!workspace.entitlements.teamsEnabled && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Teams unlock on Team, Business, and Enterprise.</div>}
                    {editingTeamId && <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800">Editing an existing team. Save to update it or cancel to create a new one.</div>}
                    <div className="grid gap-3">
                      <Input placeholder="Team name" value={teamName} onChange={setTeamName} />
                      <Input placeholder="Description" value={teamDescription} onChange={setTeamDescription} />
                      <Select value={teamColour} onChange={setTeamColour}>{colours.map(colour => <option key={colour} value={colour}>{colour}</option>)}</Select>
                      <Input placeholder="Default job type" value={teamDefaultJobType} onChange={setTeamDefaultJobType} />
                      <Input placeholder="Service area" value={teamServiceArea} onChange={setTeamServiceArea} />
                      <Input placeholder="Working hours" value={teamWorkingHours} onChange={setTeamWorkingHours} />
                      <button type="button" disabled={saving || !workspace.entitlements.teamsEnabled} onClick={saveTeam} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">{saving ? "Saving..." : editingTeamId ? "Save team" : "Create team"}</button>
                      {editingTeamId && <button type="button" onClick={clearTeamForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel edit</button>}
                    </div>
                  </Panel>
                  <Panel title="Teams">
                    <div className="grid gap-3 md:grid-cols-2">
                      {workspace.teams.map(team => {
                        const members = workspace.members.filter(member => member.teamIds.includes(team.id));
                        return <div key={team.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex justify-between gap-4"><div><p className="font-bold text-slate-900">{team.name}</p><p className="text-sm text-slate-600">{team.description || "No description"}</p></div><div className="flex flex-col gap-2"><button type="button" onClick={() => deleteTeam(team)} className="h-fit rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button><button type="button" onClick={() => startEditTeam(team)} className="h-fit rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white">Edit</button></div></div><div className="mt-3 text-xs text-slate-600"><p>{members.length} member{members.length === 1 ? "" : "s"}</p><p>Area: {team.serviceArea || "Not set"}</p><p>Hours: {team.workingHours || "Not set"}</p></div></div>;
                      })}
                    </div>
                  </Panel>
                </div>
              )}

              {activeTab === "roles" && <Panel title="Customer roles"><div className="grid gap-3 md:grid-cols-2">{workspace.roleOptions.map(role => <div key={role} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="font-bold text-slate-900">{role}</p><p className="mt-1 text-sm text-slate-600">Use this role for customer-company staff only. These roles never touch ShepieStudio/internal staff.</p></div>)}</div></Panel>}

              {activeTab === "plan" && <PlanPanel workspace={workspace} currentUserCount={currentUserCount} />}
              {activeTab === "future" && <Panel title="Planned quality-of-life and security"><div className="grid gap-3 md:grid-cols-2">{[...workspace.qualityOfLifeItems, ...workspace.futureSecurityItems].map(item => <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">{item}</div>)}</div></Panel>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function PlanPanel({ workspace, currentUserCount }: { workspace: CustomerStaffWorkspace; currentUserCount: number }) {
  const items = [
    ["Max users", workspace.entitlements.maxUsers ?? "Unlimited"],
    ["Teams", workspace.entitlements.teamsEnabled ? "Included" : "Upgrade"],
    ["Staff scheduling", workspace.entitlements.staffSchedulingEnabled ? "Included" : "Upgrade"],
    ["Advanced permissions", workspace.entitlements.advancedPermissionsEnabled ? "Included" : "Upgrade"],
    ["Reporting", workspace.entitlements.reportingEnabled ? "Included" : "Upgrade"],
    ["API access", workspace.entitlements.apiAccessEnabled ? "Included" : "Upgrade"],
  ];
  return <Panel title="Plan gates"><p className="mb-4 text-sm text-slate-600">Current usage: {currentUserCount}/{workspace.entitlements.maxUsers ?? "∞"} users. Team sizes are flexible inside the total user limit.</p><div className="grid gap-3 md:grid-cols-3">{items.map(([label, value]) => <div key={String(label)} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div>)}</div></Panel>;
}

function TeamPicker({ teams, selectedIds, onChange, compact = false }: { teams: CustomerTeam[]; selectedIds: number[]; onChange: (ids: number[]) => void; compact?: boolean }) {
  if (teams.length === 0) return <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">No teams yet.</p>;
  return <div className={`flex flex-wrap gap-2 ${compact ? "" : "rounded-lg border border-slate-200 p-3"}`}>{teams.map(team => <button key={team.id} type="button" onClick={() => onChange(selectedIds.includes(team.id) ? selectedIds.filter(id => id !== team.id) : [...selectedIds, team.id])} className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedIds.includes(team.id) ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{team.name}</button>)}</div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">{title}</h2><div className="mt-4">{children}</div></section>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left text-sm font-bold ${active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{children}</button>;
}

function Alert({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return <div className={`mt-6 rounded-xl border p-4 text-sm font-semibold ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>{children}</div>;
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600" />;
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600">{children}</select>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB");
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== "" ? error.message : fallback;
}
