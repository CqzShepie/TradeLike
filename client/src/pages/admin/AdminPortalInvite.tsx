import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../services/adminService";
import { authService } from "../../services/authService";
import type { AdminAccountStatus, AdminAuditLog, AdminUser, StaffRole } from "../../types/admin";
import { blankPermissions, permanentDirectorEmail, staffRoles, staffStatuses } from "./adminPortalConstants";
import { allPermissions, formatStatus, getErrorMessage, getPermissionsFromUser, toStaffRole } from "./adminPortalHelpers";
import type { PermissionFlags } from "./adminPortalTypes";
import { AuditLogRow, Badge, DarkInput, DarkSelect, DarkTextarea, Field, PermissionEditor, StatCard } from "./adminPortalComponents";
import AdminDashboard from "./AdminDashboard";

type Section = "overview" | "accounts" | "staff" | "audit";

export default function AdminPortalInvite() {
  const currentUser = authService.getUser();
  const role = currentUser?.role ?? "Staff";
  const isDirector = role === "Director";
  const firstName = (currentUser?.name ?? "Staff").split(" ")[0] || "Staff";

  const canSeeAccounts = isDirector || Boolean(currentUser?.canManageAccounts) || Boolean(currentUser?.canCreateCustomers) || Boolean(currentUser?.canEditCustomers) || Boolean(currentUser?.canViewBilling);
  const canSeeStaff = isDirector || Boolean(currentUser?.canManageStaff) || Boolean(currentUser?.canViewStaff) || Boolean(currentUser?.canCreateStaff) || Boolean(currentUser?.canEditStaffPermissions);
  const canSeeAudit = isDirector || Boolean(currentUser?.canViewAuditLogs);

  const defaultSection: Section = isDirector ? "overview" : canSeeAccounts ? "accounts" : canSeeStaff ? "staff" : "audit";
  const [section, setSection] = useState<Section>(defaultSection);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<AdminUser | null>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("Support");
  const [invitePaTo, setInvitePaTo] = useState("");
  const [invitePermissions, setInvitePermissions] = useState<PermissionFlags>(blankPermissions);
  const [inviteNotes, setInviteNotes] = useState("");

  const [editRole, setEditRole] = useState<StaffRole>("Support");
  const [editPaTo, setEditPaTo] = useState("");
  const [editStatus, setEditStatus] = useState<AdminAccountStatus>("Active");
  const [editPermissions, setEditPermissions] = useState<PermissionFlags>(blankPermissions);
  const [editNotes, setEditNotes] = useState("");

  const accountStats = useMemo(() => ({
    total: users.length,
    trial: users.filter(user => user.accountStatus === "Trial").length,
    active: users.filter(user => user.accountStatus === "Active").length,
    pastDue: users.filter(user => user.accountStatus === "PastDue").length,
    suspended: users.filter(user => user.accountStatus === "Suspended").length,
    cancelled: users.filter(user => user.accountStatus === "Cancelled").length,
  }), [users]);

  const filteredStaff = useMemo(() => {
    const query = staffSearch.trim().toLowerCase();
    const items = query === "" ? staff : staff.filter(user =>
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      user.accountStatus.toLowerCase().includes(query)
    );
    return {
      current: items.filter(user => user.accountStatus !== "Cancelled"),
      previous: items.filter(user => user.accountStatus === "Cancelled"),
    };
  }, [staff, staffSearch]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      const [accountsResult, staffResult, auditResult] = await Promise.all([
        canSeeAccounts ? adminService.getUsers("") : Promise.resolve([]),
        canSeeStaff ? adminService.getStaff() : Promise.resolve([]),
        canSeeAudit ? adminService.getAuditLogs("") : Promise.resolve([]),
      ]);
      setUsers(accountsResult);
      setStaff(staffResult);
      setAuditLogs(auditResult);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load admin portal."));
    } finally {
      setLoading(false);
    }
  }

  function selectStaff(user: AdminUser) {
    if (selectedStaff?.id === user.id) {
      setSelectedStaff(null);
      return;
    }
    setSelectedStaff(user);
    setEditRole(toStaffRole(user.role));
    setEditPaTo(user.personalAssistantTo ?? "");
    setEditStatus(user.accountStatus);
    setEditPermissions(getPermissionsFromUser(user));
    setEditNotes(user.adminNotes ?? "");
    setMessage("");
    setError("");
  }

  async function inviteStaff(event: FormEvent) {
    event.preventDefault();
    if (inviteFirstName.trim() === "" || inviteLastName.trim() === "" || !inviteEmail.includes("@")) {
      setError("First name, last name and a valid email are required.");
      setMessage("");
      return;
    }
    if (inviteRole === "Personal Assistant" && invitePaTo.trim() === "") {
      setError("Personal Assistant accounts must say who they are PA to.");
      setMessage("");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const invited = await adminService.createStaff({
        firstName: inviteFirstName,
        lastName: inviteLastName,
        email: inviteEmail,
        role: inviteRole,
        personalAssistantTo: invitePaTo,
        ...invitePermissions,
        adminNotes: inviteNotes,
      });
      setStaff(previous => [invited, ...previous]);
      setInviteFirstName("");
      setInviteLastName("");
      setInviteEmail("");
      setInviteRole("Support");
      setInvitePaTo("");
      setInvitePermissions(blankPermissions);
      setInviteNotes("");
      setMessage(`Invite created for ${invited.email}. The invite link was shown and copied where possible.`);
      if (canSeeAudit) setAuditLogs(await adminService.getAuditLogs(auditSearch));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create staff invite. Make sure the API is running and you have pulled the latest backend."));
    } finally {
      setSaving(false);
    }
  }

  async function saveStaffPermissions(event: FormEvent) {
    event.preventDefault();
    if (!selectedStaff) return;
    if (editRole === "Personal Assistant" && editPaTo.trim() === "") {
      setError("Personal Assistant accounts must say who they are PA to.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const updated = await adminService.updateStaffPermissions(selectedStaff.id, {
        role: editRole,
        personalAssistantTo: editPaTo,
        accountStatus: editStatus,
        ...editPermissions,
        adminNotes: editNotes,
      });
      setStaff(previous => previous.map(user => user.id === updated.id ? updated : user));
      setSelectedStaff(updated);
      setMessage(`Updated staff permissions for ${updated.email}.`);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update staff permissions."));
    } finally {
      setSaving(false);
    }
  }

  async function copyPendingInviteLink() {
    if (!selectedStaff) return;
    try {
      setSaving(true);
      setError("");
      const updated = await adminService.resendStaffInvite(selectedStaff.id);
      setStaff(previous => previous.map(user => user.id === updated.id ? updated : user));
      setSelectedStaff(updated);
      setMessage(`New invite link copied for ${updated.email}.`);
      if (canSeeAudit) setAuditLogs(await adminService.getAuditLogs(auditSearch));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create a new invite link."));
    } finally {
      setSaving(false);
    }
  }

  async function searchAuditForStaff(user: AdminUser) {
    setSection("audit");
    setAuditSearch(user.email);
    if (canSeeAudit) setAuditLogs(await adminService.getAuditLogs(user.email));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <Link to="/" className="text-xl font-bold text-blue-400">TradeLike</Link>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{role}</p>
          </div>
          <Link to="/dashboard" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Open customer app</Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">TradeLike Studio</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Hello {firstName}</h1>

        {error && <div className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-medium text-red-100">{error}</div>}
        {message && <div className="mt-6 rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-sm font-medium text-green-100">{message}</div>}
        {loading && <p className="mt-6 text-sm text-slate-400">Loading...</p>}

        <div className="mt-8 grid gap-6 xl:grid-cols-[260px_1fr]">
          <aside className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Studio sections</p>
            <div className="mt-3 flex flex-col gap-2">
              {isDirector && <NavButton active={section === "overview"} onClick={() => setSection("overview")}>Overview</NavButton>}
              {canSeeAccounts && <NavButton active={section === "accounts"} onClick={() => setSection("accounts")}>Customer Accounts</NavButton>}
              {canSeeStaff && <NavButton active={section === "staff"} onClick={() => setSection("staff")}>Staff & Permissions</NavButton>}
              {canSeeAudit && <NavButton active={section === "audit"} onClick={() => setSection("audit")}>Audit Logs</NavButton>}
            </div>
          </aside>

          <div className="min-w-0">
            {section === "overview" && isDirector && <AdminDashboard users={users} staffUsers={staff} auditLogs={auditLogs} onOpenAccounts={() => setSection("accounts")} onOpenAudit={() => setSection("audit")} />}

            {section === "accounts" && canSeeAccounts && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-6">
                  <StatCard label="Accounts" value={accountStats.total} />
                  <StatCard label="Trial" value={accountStats.trial} />
                  <StatCard label="Active" value={accountStats.active} />
                  <StatCard label="Past Due" value={accountStats.pastDue} />
                  <StatCard label="Suspended" value={accountStats.suspended} />
                  <StatCard label="Cancelled" value={accountStats.cancelled} />
                </div>
                <UserTable users={users} />
              </div>
            )}

            {section === "staff" && canSeeStaff && (
              <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <aside className="space-y-6">
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <h2 className="text-lg font-bold text-white">Search staff</h2>
                    <DarkInput value={staffSearch} onChange={setStaffSearch} placeholder="Name, email, role, status" className="mt-4" />
                  </div>

                  <form onSubmit={inviteStaff} className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
                    <h2 className="text-lg font-bold text-white">Invite staff user</h2>
                    <p className="mt-1 text-sm text-slate-400">No temporary password. The invitee sets their own password from the invite link.</p>
                    <div className="mt-4 grid gap-3">
                      <DarkInput value={inviteFirstName} onChange={setInviteFirstName} placeholder="First name" />
                      <DarkInput value={inviteLastName} onChange={setInviteLastName} placeholder="Last name" />
                      <DarkInput value={inviteEmail} onChange={setInviteEmail} placeholder="Staff email" type="email" />
                      <DarkSelect value={inviteRole} onChange={value => setInviteRole(value as StaffRole)}>{staffRoles.map(item => <option key={item} value={item}>{item}</option>)}</DarkSelect>
                      {inviteRole === "Personal Assistant" && <DarkInput value={invitePaTo} onChange={setInvitePaTo} placeholder="PA to" />}
                      <PermissionEditor title="Initial permissions" permissions={invitePermissions} setPermissions={setInvitePermissions} />
                      <DarkTextarea value={inviteNotes} onChange={setInviteNotes} placeholder="Internal staff notes" rows={4} />
                      <button type="submit" disabled={saving} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:bg-slate-600 disabled:text-slate-300">{saving ? "Creating invite..." : "Send Invite"}</button>
                    </div>
                  </form>
                </aside>

                <div className="space-y-6">
                  <StaffTable title="Current staff" users={filteredStaff.current} selectedStaff={selectedStaff} onSelect={selectStaff} onAudit={searchAuditForStaff} />
                  <StaffTable title="Previous staff" users={filteredStaff.previous} selectedStaff={selectedStaff} onSelect={selectStaff} onAudit={searchAuditForStaff} />

                  {selectedStaff && (
                    <form onSubmit={saveStaffPermissions} className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
                      <h2 className="text-lg font-bold text-white">Staff permissions</h2>
                      <p className="mt-1 truncate text-sm text-slate-400">{selectedStaff.email}</p>
                      {selectedStaff.email.toLowerCase() === permanentDirectorEmail && <div className="mt-4 rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 text-sm text-blue-100">Permanent Director account. Full access is protected.</div>}
                      <div className="mt-5 grid gap-4">
                        <Field label="Role"><DarkSelect value={selectedStaff.email.toLowerCase() === permanentDirectorEmail ? "Director" : editRole} onChange={value => setEditRole(value as StaffRole)} disabled={selectedStaff.email.toLowerCase() === permanentDirectorEmail}>{staffRoles.map(item => <option key={item} value={item}>{item}</option>)}</DarkSelect></Field>
                        {editRole === "Personal Assistant" && <Field label="PA to"><DarkInput value={editPaTo} onChange={setEditPaTo} disabled={selectedStaff.email.toLowerCase() === permanentDirectorEmail} /></Field>}
                        <Field label="Status"><DarkSelect value={selectedStaff.email.toLowerCase() === permanentDirectorEmail ? "Active" : editStatus} onChange={value => setEditStatus(value as AdminAccountStatus)} disabled={selectedStaff.email.toLowerCase() === permanentDirectorEmail}>{staffStatuses.map(item => <option key={item} value={item}>{formatStatus(item)}</option>)}</DarkSelect></Field>
                        <PermissionEditor title="Permissions" permissions={selectedStaff.email.toLowerCase() === permanentDirectorEmail ? allPermissions() : editPermissions} setPermissions={setEditPermissions} disabled={selectedStaff.email.toLowerCase() === permanentDirectorEmail} />
                        <Field label="Internal staff notes"><DarkTextarea value={editNotes} onChange={setEditNotes} rows={5} /></Field>
                        {selectedStaff.accountStatus === "InvitePending" && <button type="button" onClick={copyPendingInviteLink} disabled={saving} className="rounded-lg border border-blue-500/60 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50">Copy / regenerate invite link</button>}
                      </div>
                      <button type="submit" disabled={saving} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-600">{saving ? "Saving..." : "Save Staff Permissions"}</button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {section === "audit" && canSeeAudit && (
              <div className="space-y-6">
                <form onSubmit={async event => { event.preventDefault(); setAuditLogs(await adminService.getAuditLogs(auditSearch)); }} className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-white">Audit Logs</h2>
                  <div className="mt-4 flex gap-2"><input value={auditSearch} onChange={event => setAuditSearch(event.target.value)} placeholder="Search staff, email, action" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" /><button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Search</button></div>
                </form>
                <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm"><div className="max-h-[680px] divide-y divide-slate-800 overflow-y-auto">{auditLogs.map(log => <AuditLogRow key={log.id} log={log} />)}</div></div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-3 py-2 text-left text-sm font-semibold ${active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>{children}</button>;
}

function UserTable({ users }: { users: AdminUser[] }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm"><div className="border-b border-slate-800 px-5 py-4"><h2 className="text-lg font-bold text-white">Customer accounts</h2></div><div className="max-h-[560px] divide-y divide-slate-800 overflow-y-auto">{users.map(user => <div key={user.id} className="grid min-w-0 gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_100px_100px_110px]"><div className="min-w-0"><p className="truncate font-semibold text-white">{user.businessName || user.fullName || user.email}</p><p className="mt-1 truncate text-sm text-slate-400">{user.email}</p></div><Badge>{formatStatus(user.accountStatus)}</Badge><Badge>{formatStatus(user.billingStatus)}</Badge><Badge>{user.subscriptionPlan}</Badge></div>)}</div></div>;
}

function StaffTable({ title, users, selectedStaff, onSelect, onAudit }: { title: string; users: AdminUser[]; selectedStaff: AdminUser | null; onSelect: (user: AdminUser) => void; onAudit: (user: AdminUser) => void }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm"><div className="border-b border-slate-800 px-5 py-4"><h2 className="text-lg font-bold text-white">{title}</h2></div><div className="max-h-[360px] divide-y divide-slate-800 overflow-y-auto">{users.map(user => <div key={user.id} className={`grid min-w-0 gap-3 px-5 py-4 hover:bg-slate-800 md:grid-cols-[minmax(0,1fr)_100px_110px_70px] ${selectedStaff?.id === user.id ? "bg-slate-800" : ""}`}><button type="button" onClick={() => onSelect(user)} className="min-w-0 text-left"><p className="truncate font-semibold text-white">{user.fullName || user.email}</p><p className="mt-1 truncate text-sm text-slate-400">{user.email}</p>{user.role === "Personal Assistant" && user.personalAssistantTo && <p className="mt-1 truncate text-xs text-blue-300">PA to {user.personalAssistantTo}</p>}</button><Badge>{user.role}</Badge><Badge>{formatStatus(user.accountStatus)}</Badge><button type="button" onClick={() => onAudit(user)} className="h-fit rounded-lg border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700">Logs</button></div>)}</div></div>;
}
