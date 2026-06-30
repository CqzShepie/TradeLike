import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../services/adminService";
import { authService } from "../services/authService";
import type {
  AdminAccountStatus,
  AdminAuditLog,
  AdminDiscountType,
  AdminUser,
} from "../types/admin";

type AdminSection = "accounts" | "staff" | "audit";

const accountStatuses: AdminAccountStatus[] = [
  "Trial",
  "Active",
  "PastDue",
  "Suspended",
  "Cancelled",
];

const staffStatuses: AdminAccountStatus[] = [
  "Active",
  "Suspended",
  "Cancelled",
];

const discountTypes: AdminDiscountType[] = ["None", "Amount", "Percentage"];

const staffRoles = ["Director", "Admin", "Support"] as const;

const permanentDirectorEmail = "admin@tradelike.co.uk";

export default function AdminPortal() {
  const currentUser = authService.getUser();

  const staffFullName = currentUser?.name?.trim() || "Staff";
  const staffFirstName = staffFullName.split(" ")[0] || "Staff";
  const staffRole = currentUser?.role || "Staff";

  const isDirector = staffRole === "Director";

  const canSeeAccounts =
    isDirector ||
    Boolean(currentUser?.canManageAccounts) ||
    Boolean(currentUser?.canManageBilling) ||
    Boolean(currentUser?.canManageSecurity);

  const canSeeStaff =
    isDirector ||
    Boolean(currentUser?.canManageStaff);

  const canSeeAuditLogs =
    isDirector ||
    Boolean(currentUser?.canViewAuditLogs);

  const defaultSection: AdminSection = canSeeAccounts
    ? "accounts"
    : canSeeStaff
    ? "staff"
    : "audit";

  const [activeSection, setActiveSection] =
    useState<AdminSection>(defaultSection);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [staffUsers, setStaffUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<AdminUser | null>(null);

  const [search, setSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createStatus, setCreateStatus] =
    useState<AdminAccountStatus>("Trial");
  const [createNotes, setCreateNotes] = useState("");

  const [accountStatus, setAccountStatus] =
    useState<AdminAccountStatus>("Trial");
  const [discountType, setDiscountType] =
    useState<AdminDiscountType>("None");
  const [discountValue, setDiscountValue] = useState("0");
  const [freeMonths, setFreeMonths] = useState("0");
  const [adminNotes, setAdminNotes] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requirePasswordReset, setRequirePasswordReset] = useState(true);

  const [createStaffFirstName, setCreateStaffFirstName] = useState("");
  const [createStaffLastName, setCreateStaffLastName] = useState("");
  const [createStaffEmail, setCreateStaffEmail] = useState("");
  const [createStaffPassword, setCreateStaffPassword] = useState("");
  const [createStaffRole, setCreateStaffRole] =
    useState<"Director" | "Admin" | "Support">("Support");
  const [createStaffCanManageAccounts, setCreateStaffCanManageAccounts] =
    useState(false);
  const [createStaffCanManageStaff, setCreateStaffCanManageStaff] =
    useState(false);
  const [createStaffCanManageBilling, setCreateStaffCanManageBilling] =
    useState(false);
  const [createStaffCanManageSecurity, setCreateStaffCanManageSecurity] =
    useState(false);
  const [createStaffCanViewAuditLogs, setCreateStaffCanViewAuditLogs] =
    useState(false);
  const [createStaffNotes, setCreateStaffNotes] = useState("");

  const [staffEditRole, setStaffEditRole] =
    useState<"Director" | "Admin" | "Support">("Support");
  const [staffEditStatus, setStaffEditStatus] =
    useState<AdminAccountStatus>("Active");
  const [staffEditCanManageAccounts, setStaffEditCanManageAccounts] =
    useState(false);
  const [staffEditCanManageStaff, setStaffEditCanManageStaff] =
    useState(false);
  const [staffEditCanManageBilling, setStaffEditCanManageBilling] =
    useState(false);
  const [staffEditCanManageSecurity, setStaffEditCanManageSecurity] =
    useState(false);
  const [staffEditCanViewAuditLogs, setStaffEditCanViewAuditLogs] =
    useState(false);
  const [staffEditNotes, setStaffEditNotes] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const customerStats = useMemo(() => {
    return {
      total: users.length,
      trial: users.filter(user => user.accountStatus === "Trial").length,
      active: users.filter(user => user.accountStatus === "Active").length,
      pastDue: users.filter(user => user.accountStatus === "PastDue").length,
      suspended: users.filter(user => user.accountStatus === "Suspended").length,
    };
  }, [users]);

  const staffStats = useMemo(() => {
    return {
      total: staffUsers.length,
      directors: staffUsers.filter(user => user.role === "Director").length,
      admins: staffUsers.filter(user => user.role === "Admin").length,
      support: staffUsers.filter(user => user.role === "Support").length,
    };
  }, [staffUsers]);

  const filteredStaffUsers = useMemo(() => {
    const query = staffSearch.trim().toLowerCase();

    if (query === "") {
      return staffUsers;
    }

    return staffUsers.filter(user =>
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      user.accountStatus.toLowerCase().includes(query)
    );
  }, [staffSearch, staffUsers]);

  useEffect(() => {
    if (activeSection === "accounts" && !canSeeAccounts) {
      setActiveSection(canSeeStaff ? "staff" : "audit");
    }

    if (activeSection === "staff" && !canSeeStaff) {
      setActiveSection(canSeeAccounts ? "accounts" : "audit");
    }

    if (activeSection === "audit" && !canSeeAuditLogs) {
      setActiveSection(canSeeAccounts ? "accounts" : "staff");
    }
  }, [
    activeSection,
    canSeeAccounts,
    canSeeAuditLogs,
    canSeeStaff,
  ]);

  useEffect(() => {
    if (canSeeAccounts) {
      loadUsers("");
    }

    if (canSeeStaff) {
      loadStaff();
    }

    if (canSeeAuditLogs) {
      loadAuditLogs("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUsers(searchTerm = search) {
    if (!canSeeAccounts) {
      return;
    }

    try {
      setLoadingUsers(true);
      setError("");

      const data = await adminService.getUsers(searchTerm);

      setUsers(data);

      if (selectedUser) {
        const refreshed = data.find(user => user.id === selectedUser.id) ?? null;
        setSelectedUser(refreshed);

        if (refreshed) {
          fillSelectedUserForm(refreshed);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load customer accounts."));
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadStaff() {
    if (!canSeeStaff) {
      return;
    }

    try {
      setLoadingStaff(true);
      setError("");

      const data = await adminService.getStaff();

      setStaffUsers(data);

      if (selectedStaff) {
        const refreshed = data.find(user => user.id === selectedStaff.id) ?? null;
        setSelectedStaff(refreshed);

        if (refreshed) {
          fillSelectedStaffForm(refreshed);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load staff users."));
    } finally {
      setLoadingStaff(false);
    }
  }

  async function loadAuditLogs(searchTerm = auditSearch) {
    if (!canSeeAuditLogs) {
      return;
    }

    try {
      setLoadingAuditLogs(true);
      setError("");

      const data = await adminService.getAuditLogs(searchTerm);

      setAuditLogs(data);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load audit logs."));
    } finally {
      setLoadingAuditLogs(false);
    }
  }

  function selectUser(user: AdminUser) {
    setSelectedUser(user);
    fillSelectedUserForm(user);
    setError("");
    setMessage("");
  }

  function fillSelectedUserForm(user: AdminUser) {
    setAccountStatus(user.accountStatus);
    setDiscountType(user.discountType);
    setDiscountValue(String(user.discountValue ?? 0));
    setFreeMonths(String(user.freeMonths ?? 0));
    setAdminNotes(user.adminNotes ?? "");
    setNewPassword("");
    setRequirePasswordReset(true);
  }

  function selectStaff(user: AdminUser) {
    setSelectedStaff(user);
    fillSelectedStaffForm(user);
    setError("");
    setMessage("");
  }

  function fillSelectedStaffForm(user: AdminUser) {
    setStaffEditRole(
      user.role === "Director" || user.role === "Admin" || user.role === "Support"
        ? user.role
        : "Support"
    );
    setStaffEditStatus(user.accountStatus);
    setStaffEditCanManageAccounts(user.canManageAccounts);
    setStaffEditCanManageStaff(user.canManageStaff);
    setStaffEditCanManageBilling(user.canManageBilling);
    setStaffEditCanManageSecurity(user.canManageSecurity);
    setStaffEditCanViewAuditLogs(user.canViewAuditLogs);
    setStaffEditNotes(user.adminNotes ?? "");
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    await loadUsers(search);
  }

  async function handleAuditSearch(event: FormEvent) {
    event.preventDefault();
    await loadAuditLogs(auditSearch);
  }

  async function handleCreateUser(event: FormEvent) {
    event.preventDefault();

    if (createFirstName.trim() === "") {
      setError("First name is required.");
      return;
    }

    if (createLastName.trim() === "") {
      setError("Last name is required.");
      return;
    }

    if (!createEmail.includes("@")) {
      setError("A valid email address is required.");
      return;
    }

    if (createPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const created = await adminService.createUser({
        firstName: createFirstName,
        lastName: createLastName,
        email: createEmail,
        password: createPassword,
        accountStatus: createStatus,
        adminNotes: createNotes,
      });

      setUsers(previous => [created, ...previous]);
      selectUser(created);

      setCreateFirstName("");
      setCreateLastName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateStatus("Trial");
      setCreateNotes("");

      setMessage(`Created customer account for ${created.email}.`);
      await loadAuditLogs();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create customer account."));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAccount(event: FormEvent) {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updated = await adminService.updateAccount(selectedUser.id, {
        accountStatus,
        discountType,
        discountValue: Number(discountValue || 0),
        freeMonths: Number(freeMonths || 0),
        adminNotes,
      });

      upsertUser(updated);
      selectUser(updated);
      setMessage(`Updated customer account for ${updated.email}.`);
      await loadAuditLogs();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update customer account."));
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(event: FormEvent) {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updated = await adminService.resetPassword(selectedUser.id, {
        newPassword,
        requirePasswordReset,
      });

      upsertUser(updated);
      selectUser(updated);
      setMessage(`Password updated for ${updated.email}.`);
      await loadAuditLogs();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to reset password."));
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkVerified() {
    if (!selectedUser) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updated = await adminService.markEmailVerified(selectedUser.id);

      upsertUser(updated);
      selectUser(updated);
      setMessage(`${updated.email} is now marked as verified.`);
      await loadAuditLogs();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to mark email as verified."));
    } finally {
      setSaving(false);
    }
  }

  async function handleSendVerificationEmail() {
    if (!selectedUser) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await adminService.sendVerificationEmail(selectedUser.id);

      upsertUser(response.user);
      selectUser(response.user);
      setMessage(response.message);
      await loadAuditLogs();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to send verification email."));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateStaff(event: FormEvent) {
    event.preventDefault();

    if (createStaffFirstName.trim() === "") {
      setError("Staff first name is required.");
      return;
    }

    if (createStaffLastName.trim() === "") {
      setError("Staff last name is required.");
      return;
    }

    if (!createStaffEmail.includes("@")) {
      setError("A valid staff email address is required.");
      return;
    }

    if (createStaffPassword.length < 8) {
      setError("Staff password must be at least 8 characters.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const created = await adminService.createStaff({
        firstName: createStaffFirstName,
        lastName: createStaffLastName,
        email: createStaffEmail,
        password: createStaffPassword,
        role: createStaffRole,
        canManageAccounts: createStaffCanManageAccounts,
        canManageStaff: createStaffCanManageStaff,
        canManageBilling: createStaffCanManageBilling,
        canManageSecurity: createStaffCanManageSecurity,
        canViewAuditLogs: createStaffCanViewAuditLogs,
        adminNotes: createStaffNotes,
      });

      setStaffUsers(previous => [created, ...previous]);
      selectStaff(created);

      setCreateStaffFirstName("");
      setCreateStaffLastName("");
      setCreateStaffEmail("");
      setCreateStaffPassword("");
      setCreateStaffRole("Support");
      setCreateStaffCanManageAccounts(false);
      setCreateStaffCanManageStaff(false);
      setCreateStaffCanManageBilling(false);
      setCreateStaffCanManageSecurity(false);
      setCreateStaffCanViewAuditLogs(false);
      setCreateStaffNotes("");

      setMessage(`Created staff account for ${created.email}.`);
      await loadAuditLogs();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create staff account."));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveStaffPermissions(event: FormEvent) {
    event.preventDefault();

    if (!selectedStaff) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updated = await adminService.updateStaffPermissions(
        selectedStaff.id,
        {
          role: staffEditRole,
          accountStatus: staffEditStatus,
          canManageAccounts: staffEditCanManageAccounts,
          canManageStaff: staffEditCanManageStaff,
          canManageBilling: staffEditCanManageBilling,
          canManageSecurity: staffEditCanManageSecurity,
          canViewAuditLogs: staffEditCanViewAuditLogs,
          adminNotes: staffEditNotes,
        }
      );

      upsertStaff(updated);
      selectStaff(updated);
      setMessage(`Updated staff permissions for ${updated.email}.`);
      await loadAuditLogs();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update staff permissions."));
    } finally {
      setSaving(false);
    }
  }

  function upsertUser(user: AdminUser) {
    setUsers(previous =>
      previous.some(existing => existing.id === user.id)
        ? previous.map(existing => (existing.id === user.id ? user : existing))
        : [user, ...previous]
    );
  }

  function upsertStaff(user: AdminUser) {
    setStaffUsers(previous =>
      previous.some(existing => existing.id === user.id)
        ? previous.map(existing => (existing.id === user.id ? user : existing))
        : [user, ...previous]
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <Link to="/" className="text-xl font-bold text-blue-400">
              TradeLike
            </Link>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {staffRole}
            </p>
          </div>

          <nav className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900"
            >
              Back to Login
            </Link>

            <Link
              to="/dashboard"
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Open App
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
              Staff Admin Portal
            </p>

            <h1 className="mt-1 text-3xl font-bold text-white">
              Hello {staffFirstName}
            </h1>

            <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
              {staffRole}
            </p>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Manage SaaS customer accounts, staff permissions, free months,
              discounts, verification status, passwords, and audit logs.
            </p>
          </div>

          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            Every admin change is logged with the staff member, action, target,
            and timestamp.
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-medium text-red-100">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-sm font-medium text-green-100">
            {message}
          </div>
        )}

        <div className="mt-8 grid gap-6 xl:grid-cols-[260px_1fr]">
          <aside className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Admin sections
            </p>

            <div className="mt-3 flex flex-col gap-2">
              {canSeeAccounts && (
                <AdminNavButton
                  active={activeSection === "accounts"}
                  onClick={() => setActiveSection("accounts")}
                >
                  Customer Accounts
                </AdminNavButton>
              )}

              {canSeeStaff && (
                <AdminNavButton
                  active={activeSection === "staff"}
                  onClick={() => setActiveSection("staff")}
                >
                  Staff & Permissions
                </AdminNavButton>
              )}

              {canSeeAuditLogs && (
                <AdminNavButton
                  active={activeSection === "audit"}
                  onClick={() => setActiveSection("audit")}
                >
                  Audit Logs
                </AdminNavButton>
              )}
            </div>
          </aside>

          <div>
            {activeSection === "accounts" && canSeeAccounts && (
              <CustomerAccountsSection
                users={users}
                selectedUser={selectedUser}
                loadingUsers={loadingUsers}
                search={search}
                setSearch={setSearch}
                customerStats={customerStats}
                selectUser={selectUser}
                handleSearch={handleSearch}
                createFirstName={createFirstName}
                setCreateFirstName={setCreateFirstName}
                createLastName={createLastName}
                setCreateLastName={setCreateLastName}
                createEmail={createEmail}
                setCreateEmail={setCreateEmail}
                createPassword={createPassword}
                setCreatePassword={setCreatePassword}
                createStatus={createStatus}
                setCreateStatus={setCreateStatus}
                createNotes={createNotes}
                setCreateNotes={setCreateNotes}
                handleCreateUser={handleCreateUser}
                saving={saving}
                accountStatus={accountStatus}
                setAccountStatus={setAccountStatus}
                discountType={discountType}
                setDiscountType={setDiscountType}
                discountValue={discountValue}
                setDiscountValue={setDiscountValue}
                freeMonths={freeMonths}
                setFreeMonths={setFreeMonths}
                adminNotes={adminNotes}
                setAdminNotes={setAdminNotes}
                handleSaveAccount={handleSaveAccount}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                requirePasswordReset={requirePasswordReset}
                setRequirePasswordReset={setRequirePasswordReset}
                handleResetPassword={handleResetPassword}
                handleMarkVerified={handleMarkVerified}
                handleSendVerificationEmail={handleSendVerificationEmail}
              />
            )}

            {activeSection === "staff" && canSeeStaff && (
              <StaffPermissionsSection
                staffUsers={filteredStaffUsers}
                selectedStaff={selectedStaff}
                staffStats={staffStats}
                loadingStaff={loadingStaff}
                staffSearch={staffSearch}
                setStaffSearch={setStaffSearch}
                selectStaff={selectStaff}
                saving={saving}
                createStaffFirstName={createStaffFirstName}
                setCreateStaffFirstName={setCreateStaffFirstName}
                createStaffLastName={createStaffLastName}
                setCreateStaffLastName={setCreateStaffLastName}
                createStaffEmail={createStaffEmail}
                setCreateStaffEmail={setCreateStaffEmail}
                createStaffPassword={createStaffPassword}
                setCreateStaffPassword={setCreateStaffPassword}
                createStaffRole={createStaffRole}
                setCreateStaffRole={setCreateStaffRole}
                createStaffCanManageAccounts={createStaffCanManageAccounts}
                setCreateStaffCanManageAccounts={setCreateStaffCanManageAccounts}
                createStaffCanManageStaff={createStaffCanManageStaff}
                setCreateStaffCanManageStaff={setCreateStaffCanManageStaff}
                createStaffCanManageBilling={createStaffCanManageBilling}
                setCreateStaffCanManageBilling={setCreateStaffCanManageBilling}
                createStaffCanManageSecurity={createStaffCanManageSecurity}
                setCreateStaffCanManageSecurity={setCreateStaffCanManageSecurity}
                createStaffCanViewAuditLogs={createStaffCanViewAuditLogs}
                setCreateStaffCanViewAuditLogs={setCreateStaffCanViewAuditLogs}
                createStaffNotes={createStaffNotes}
                setCreateStaffNotes={setCreateStaffNotes}
                handleCreateStaff={handleCreateStaff}
                staffEditRole={staffEditRole}
                setStaffEditRole={setStaffEditRole}
                staffEditStatus={staffEditStatus}
                setStaffEditStatus={setStaffEditStatus}
                staffEditCanManageAccounts={staffEditCanManageAccounts}
                setStaffEditCanManageAccounts={setStaffEditCanManageAccounts}
                staffEditCanManageStaff={staffEditCanManageStaff}
                setStaffEditCanManageStaff={setStaffEditCanManageStaff}
                staffEditCanManageBilling={staffEditCanManageBilling}
                setStaffEditCanManageBilling={setStaffEditCanManageBilling}
                staffEditCanManageSecurity={staffEditCanManageSecurity}
                setStaffEditCanManageSecurity={setStaffEditCanManageSecurity}
                staffEditCanViewAuditLogs={staffEditCanViewAuditLogs}
                setStaffEditCanViewAuditLogs={setStaffEditCanViewAuditLogs}
                staffEditNotes={staffEditNotes}
                setStaffEditNotes={setStaffEditNotes}
                handleSaveStaffPermissions={handleSaveStaffPermissions}
              />
            )}

            {activeSection === "audit" && canSeeAuditLogs && (
              <AuditLogsSection
                auditLogs={auditLogs}
                loadingAuditLogs={loadingAuditLogs}
                auditSearch={auditSearch}
                setAuditSearch={setAuditSearch}
                handleAuditSearch={handleAuditSearch}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function CustomerAccountsSection(props: {
  users: AdminUser[];
  selectedUser: AdminUser | null;
  loadingUsers: boolean;
  search: string;
  setSearch: (value: string) => void;
  customerStats: {
    total: number;
    trial: number;
    active: number;
    pastDue: number;
    suspended: number;
  };
  selectUser: (user: AdminUser) => void;
  handleSearch: (event: FormEvent) => void;
  createFirstName: string;
  setCreateFirstName: (value: string) => void;
  createLastName: string;
  setCreateLastName: (value: string) => void;
  createEmail: string;
  setCreateEmail: (value: string) => void;
  createPassword: string;
  setCreatePassword: (value: string) => void;
  createStatus: AdminAccountStatus;
  setCreateStatus: (value: AdminAccountStatus) => void;
  createNotes: string;
  setCreateNotes: (value: string) => void;
  handleCreateUser: (event: FormEvent) => void;
  saving: boolean;
  accountStatus: AdminAccountStatus;
  setAccountStatus: (value: AdminAccountStatus) => void;
  discountType: AdminDiscountType;
  setDiscountType: (value: AdminDiscountType) => void;
  discountValue: string;
  setDiscountValue: (value: string) => void;
  freeMonths: string;
  setFreeMonths: (value: string) => void;
  adminNotes: string;
  setAdminNotes: (value: string) => void;
  handleSaveAccount: (event: FormEvent) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  requirePasswordReset: boolean;
  setRequirePasswordReset: (value: boolean) => void;
  handleResetPassword: (event: FormEvent) => void;
  handleMarkVerified: () => void;
  handleSendVerificationEmail: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Accounts" value={props.customerStats.total} />
        <StatCard label="Trial" value={props.customerStats.trial} />
        <StatCard label="Active" value={props.customerStats.active} />
        <StatCard label="Past Due" value={props.customerStats.pastDue} />
        <StatCard label="Suspended" value={props.customerStats.suspended} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <aside className="space-y-6">
          <form
            onSubmit={props.handleSearch}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-white">
              Search accounts
            </h2>

            <div className="mt-4 flex gap-2">
              <input
                value={props.search}
                onChange={event => props.setSearch(event.target.value)}
                placeholder="Name, email, or status"
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Search
              </button>
            </div>
          </form>

          <form
            onSubmit={props.handleCreateUser}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-white">
              Create customer account
            </h2>

            <div className="mt-4 grid gap-3">
              <DarkInput
                value={props.createFirstName}
                onChange={props.setCreateFirstName}
                placeholder="First name"
              />

              <DarkInput
                value={props.createLastName}
                onChange={props.setCreateLastName}
                placeholder="Last name"
              />

              <DarkInput
                value={props.createEmail}
                onChange={props.setCreateEmail}
                placeholder="Email address"
                type="email"
              />

              <DarkInput
                value={props.createPassword}
                onChange={props.setCreatePassword}
                placeholder="Temporary password"
                type="password"
              />

              <DarkSelect
                value={props.createStatus}
                onChange={value => props.setCreateStatus(value as AdminAccountStatus)}
              >
                {accountStatuses.map(status => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </DarkSelect>

              <DarkTextarea
                value={props.createNotes}
                onChange={props.setCreateNotes}
                placeholder="Internal admin notes"
                rows={4}
              />

              <button
                type="submit"
                disabled={props.saving}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
              >
                {props.saving ? "Creating..." : "Create Customer"}
              </button>
            </div>
          </form>
        </aside>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="text-lg font-bold text-white">
                Customer accounts
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Select an account to manage discounts, free months, passwords,
                verification, and notes.
              </p>
            </div>

            {props.loadingUsers ? (
              <div className="p-5 text-sm text-slate-400">
                Loading...
              </div>
            ) : props.users.length === 0 ? (
              <div className="p-5 text-sm text-slate-400">
                No customer accounts found.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {props.users.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => props.selectUser(user)}
                    className={`grid w-full gap-3 px-5 py-4 text-left hover:bg-slate-800 md:grid-cols-[1fr_140px_120px_140px] ${
                      props.selectedUser?.id === user.id ? "bg-slate-800" : ""
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {user.fullName || user.email}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {user.email}
                      </p>
                    </div>

                    <Badge>{formatStatus(user.accountStatus)}</Badge>

                    <Badge>{user.isEmailVerified ? "Verified" : "Unverified"}</Badge>

                    <Badge>{formatDiscount(user)}</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          {props.selectedUser && (
            <div className="grid gap-6 xl:grid-cols-2">
              <form
                onSubmit={props.handleSaveAccount}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
              >
                <h2 className="text-lg font-bold text-white">
                  Manage customer
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {props.selectedUser.email}
                </p>

                <div className="mt-5 grid gap-4">
                  <Field label="Account status">
                    <DarkSelect
                      value={props.accountStatus}
                      onChange={value => props.setAccountStatus(value as AdminAccountStatus)}
                    >
                      {accountStatuses.map(status => (
                        <option key={status} value={status}>
                          {formatStatus(status)}
                        </option>
                      ))}
                    </DarkSelect>
                  </Field>

                  <Field label="Discount type">
                    <DarkSelect
                      value={props.discountType}
                      onChange={value => props.setDiscountType(value as AdminDiscountType)}
                    >
                      {discountTypes.map(type => (
                        <option key={type} value={type}>
                          {type === "None"
                            ? "No discount"
                            : type === "Amount"
                            ? "£ amount"
                            : "% percentage"}
                        </option>
                      ))}
                    </DarkSelect>
                  </Field>

                  <Field
                    label={
                      props.discountType === "Percentage"
                        ? "Discount value (%)"
                        : "Discount value (£)"
                    }
                  >
                    <DarkInput
                      value={props.discountValue}
                      onChange={props.setDiscountValue}
                      type="number"
                      min="0"
                      max={props.discountType === "Percentage" ? 100 : undefined}
                      step="1"
                      disabled={props.discountType === "None"}
                    />
                  </Field>

                  <Field label="Free months">
                    <DarkInput
                      value={props.freeMonths}
                      onChange={props.setFreeMonths}
                      type="number"
                      min="0"
                      max="120"
                      step="1"
                    />
                  </Field>

                  <Field label="Internal admin notes">
                    <DarkTextarea
                      value={props.adminNotes}
                      onChange={props.setAdminNotes}
                      rows={6}
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={props.saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                  >
                    {props.saving ? "Saving..." : "Save Customer Changes"}
                  </button>
                </div>
              </form>

              <div className="space-y-6">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-white">
                    Verification
                  </h2>

                  <div className="mt-4 space-y-3 text-sm text-slate-400">
                    <p>
                      Status:{" "}
                      <span className="font-semibold text-white">
                        {props.selectedUser.isEmailVerified
                          ? "Verified"
                          : "Unverified"}
                      </span>
                    </p>

                    <p>
                      Last verification send action:{" "}
                      <span className="font-semibold text-white">
                        {props.selectedUser.emailVerificationSentAt
                          ? formatDateTime(props.selectedUser.emailVerificationSentAt)
                          : "Never"}
                      </span>
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={props.handleSendVerificationEmail}
                      disabled={props.saving}
                      className="rounded-lg border border-blue-500/50 px-3 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Send verification email
                    </button>

                    <button
                      type="button"
                      onClick={props.handleMarkVerified}
                      disabled={props.saving || props.selectedUser.isEmailVerified}
                      className="rounded-lg border border-green-500/50 px-3 py-2 text-xs font-semibold text-green-200 hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Mark verified
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={props.handleResetPassword}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
                >
                  <h2 className="text-lg font-bold text-white">
                    Reset password
                  </h2>

                  <div className="mt-4 space-y-4">
                    <DarkInput
                      value={props.newPassword}
                      onChange={props.setNewPassword}
                      type="password"
                      placeholder="New temporary password"
                    />

                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={props.requirePasswordReset}
                        onChange={event =>
                          props.setRequirePasswordReset(event.target.checked)
                        }
                      />
                      Require password reset on next login
                    </label>

                    <button
                      type="submit"
                      disabled={props.saving}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                    >
                      {props.saving ? "Updating..." : "Reset Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StaffPermissionsSection(props: {
  staffUsers: AdminUser[];
  selectedStaff: AdminUser | null;
  staffStats: {
    total: number;
    directors: number;
    admins: number;
    support: number;
  };
  loadingStaff: boolean;
  staffSearch: string;
  setStaffSearch: (value: string) => void;
  selectStaff: (user: AdminUser) => void;
  saving: boolean;
  createStaffFirstName: string;
  setCreateStaffFirstName: (value: string) => void;
  createStaffLastName: string;
  setCreateStaffLastName: (value: string) => void;
  createStaffEmail: string;
  setCreateStaffEmail: (value: string) => void;
  createStaffPassword: string;
  setCreateStaffPassword: (value: string) => void;
  createStaffRole: "Director" | "Admin" | "Support";
  setCreateStaffRole: (value: "Director" | "Admin" | "Support") => void;
  createStaffCanManageAccounts: boolean;
  setCreateStaffCanManageAccounts: (value: boolean) => void;
  createStaffCanManageStaff: boolean;
  setCreateStaffCanManageStaff: (value: boolean) => void;
  createStaffCanManageBilling: boolean;
  setCreateStaffCanManageBilling: (value: boolean) => void;
  createStaffCanManageSecurity: boolean;
  setCreateStaffCanManageSecurity: (value: boolean) => void;
  createStaffCanViewAuditLogs: boolean;
  setCreateStaffCanViewAuditLogs: (value: boolean) => void;
  createStaffNotes: string;
  setCreateStaffNotes: (value: string) => void;
  handleCreateStaff: (event: FormEvent) => void;
  staffEditRole: "Director" | "Admin" | "Support";
  setStaffEditRole: (value: "Director" | "Admin" | "Support") => void;
  staffEditStatus: AdminAccountStatus;
  setStaffEditStatus: (value: AdminAccountStatus) => void;
  staffEditCanManageAccounts: boolean;
  setStaffEditCanManageAccounts: (value: boolean) => void;
  staffEditCanManageStaff: boolean;
  setStaffEditCanManageStaff: (value: boolean) => void;
  staffEditCanManageBilling: boolean;
  setStaffEditCanManageBilling: (value: boolean) => void;
  staffEditCanManageSecurity: boolean;
  setStaffEditCanManageSecurity: (value: boolean) => void;
  staffEditCanViewAuditLogs: boolean;
  setStaffEditCanViewAuditLogs: (value: boolean) => void;
  staffEditNotes: string;
  setStaffEditNotes: (value: string) => void;
  handleSaveStaffPermissions: (event: FormEvent) => void;
}) {
  const selectedIsPermanentDirector =
    props.selectedStaff?.email?.toLowerCase() === permanentDirectorEmail;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Staff" value={props.staffStats.total} />
        <StatCard label="Directors" value={props.staffStats.directors} />
        <StatCard label="Admins" value={props.staffStats.admins} />
        <StatCard label="Support" value={props.staffStats.support} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <aside className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-bold text-white">
              Search staff
            </h2>

            <DarkInput
              value={props.staffSearch}
              onChange={props.setStaffSearch}
              placeholder="Name, email, role, or status"
              className="mt-4"
            />
          </div>

          <form
            onSubmit={props.handleCreateStaff}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-white">
              Create staff user
            </h2>

            <div className="mt-4 grid gap-3">
              <DarkInput
                value={props.createStaffFirstName}
                onChange={props.setCreateStaffFirstName}
                placeholder="First name"
              />

              <DarkInput
                value={props.createStaffLastName}
                onChange={props.setCreateStaffLastName}
                placeholder="Last name"
              />

              <DarkInput
                value={props.createStaffEmail}
                onChange={props.setCreateStaffEmail}
                placeholder="Staff email"
                type="email"
              />

              <DarkInput
                value={props.createStaffPassword}
                onChange={props.setCreateStaffPassword}
                placeholder="Temporary password"
                type="password"
              />

              <DarkSelect
                value={props.createStaffRole}
                onChange={value =>
                  props.setCreateStaffRole(value as "Director" | "Admin" | "Support")
                }
              >
                {staffRoles.map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </DarkSelect>

              <PermissionCheckbox
                checked={props.createStaffCanManageAccounts}
                onChange={props.setCreateStaffCanManageAccounts}
                label="Manage customer accounts"
              />

              <PermissionCheckbox
                checked={props.createStaffCanManageStaff}
                onChange={props.setCreateStaffCanManageStaff}
                label="Manage staff"
              />

              <PermissionCheckbox
                checked={props.createStaffCanManageBilling}
                onChange={props.setCreateStaffCanManageBilling}
                label="Manage billing controls"
              />

              <PermissionCheckbox
                checked={props.createStaffCanManageSecurity}
                onChange={props.setCreateStaffCanManageSecurity}
                label="Manage security, passwords, and verification"
              />

              <PermissionCheckbox
                checked={props.createStaffCanViewAuditLogs}
                onChange={props.setCreateStaffCanViewAuditLogs}
                label="View audit logs"
              />

              <DarkTextarea
                value={props.createStaffNotes}
                onChange={props.setCreateStaffNotes}
                placeholder="Internal staff notes"
                rows={4}
              />

              <button
                type="submit"
                disabled={props.saving}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
              >
                {props.saving ? "Creating..." : "Create Staff"}
              </button>
            </div>
          </form>
        </aside>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="text-lg font-bold text-white">
                Staff users
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Select a staff user to edit their role and permissions.
              </p>
            </div>

            {props.loadingStaff ? (
              <div className="p-5 text-sm text-slate-400">
                Loading...
              </div>
            ) : props.staffUsers.length === 0 ? (
              <div className="p-5 text-sm text-slate-400">
                No staff users found.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {props.staffUsers.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => props.selectStaff(user)}
                    className={`grid w-full gap-3 px-5 py-4 text-left hover:bg-slate-800 md:grid-cols-[1fr_120px_120px_180px] ${
                      props.selectedStaff?.id === user.id ? "bg-slate-800" : ""
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {user.fullName || user.email}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {user.email}
                      </p>
                    </div>

                    <Badge>{user.role}</Badge>

                    <Badge>{formatStatus(user.accountStatus)}</Badge>

                    <Badge>{summarisePermissions(user)}</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          {props.selectedStaff && (
            <form
              onSubmit={props.handleSaveStaffPermissions}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold text-white">
                Staff permissions
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {props.selectedStaff.email}
              </p>

              {selectedIsPermanentDirector && (
                <div className="mt-4 rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 text-sm text-blue-100">
                  This is Thomas Kennington’s permanent Director account. It
                  always keeps full permissions and cannot be demoted or
                  suspended.
                </div>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Role">
                  <DarkSelect
                    value={selectedIsPermanentDirector ? "Director" : props.staffEditRole}
                    onChange={value =>
                      props.setStaffEditRole(value as "Director" | "Admin" | "Support")
                    }
                    disabled={selectedIsPermanentDirector}
                  >
                    {staffRoles.map(role => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </DarkSelect>
                </Field>

                <Field label="Status">
                  <DarkSelect
                    value={selectedIsPermanentDirector ? "Active" : props.staffEditStatus}
                    onChange={value =>
                      props.setStaffEditStatus(value as AdminAccountStatus)
                    }
                    disabled={selectedIsPermanentDirector}
                  >
                    {staffStatuses.map(status => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </DarkSelect>
                </Field>

                <div className="md:col-span-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="mb-3 text-sm font-semibold text-white">
                      Section permissions
                    </p>

                    <div className="grid gap-3 md:grid-cols-2">
                      <PermissionCheckbox
                        checked={
                          selectedIsPermanentDirector ||
                          props.staffEditCanManageAccounts
                        }
                        onChange={props.setStaffEditCanManageAccounts}
                        disabled={selectedIsPermanentDirector}
                        label="Manage customer accounts"
                      />

                      <PermissionCheckbox
                        checked={
                          selectedIsPermanentDirector ||
                          props.staffEditCanManageStaff
                        }
                        onChange={props.setStaffEditCanManageStaff}
                        disabled={selectedIsPermanentDirector}
                        label="Manage staff"
                      />

                      <PermissionCheckbox
                        checked={
                          selectedIsPermanentDirector ||
                          props.staffEditCanManageBilling
                        }
                        onChange={props.setStaffEditCanManageBilling}
                        disabled={selectedIsPermanentDirector}
                        label="Manage billing controls"
                      />

                      <PermissionCheckbox
                        checked={
                          selectedIsPermanentDirector ||
                          props.staffEditCanManageSecurity
                        }
                        onChange={props.setStaffEditCanManageSecurity}
                        disabled={selectedIsPermanentDirector}
                        label="Manage security, passwords, and verification"
                      />

                      <PermissionCheckbox
                        checked={
                          selectedIsPermanentDirector ||
                          props.staffEditCanViewAuditLogs
                        }
                        onChange={props.setStaffEditCanViewAuditLogs}
                        disabled={selectedIsPermanentDirector}
                        label="View audit logs"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Field label="Internal staff notes">
                    <DarkTextarea
                      value={props.staffEditNotes}
                      onChange={props.setStaffEditNotes}
                      rows={5}
                    />
                  </Field>
                </div>
              </div>

              <button
                type="submit"
                disabled={props.saving}
                className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600"
              >
                {props.saving ? "Saving..." : "Save Staff Permissions"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function AuditLogsSection(props: {
  auditLogs: AdminAuditLog[];
  loadingAuditLogs: boolean;
  auditSearch: string;
  setAuditSearch: (value: string) => void;
  handleAuditSearch: (event: FormEvent) => void;
}) {
  return (
    <div className="space-y-6">
      <form
        onSubmit={props.handleAuditSearch}
        className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
      >
        <h2 className="text-lg font-bold text-white">
          Audit Logs
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          See who made each admin change, which user was affected, and when it
          happened.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            value={props.auditSearch}
            onChange={event => props.setAuditSearch(event.target.value)}
            placeholder="Search actor, target, action, or summary"
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="text-lg font-bold text-white">
            Latest admin actions
          </h2>
        </div>

        {props.loadingAuditLogs ? (
          <div className="p-5 text-sm text-slate-400">
            Loading...
          </div>
        ) : props.auditLogs.length === 0 ? (
          <div className="p-5 text-sm text-slate-400">
            No audit logs found yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {props.auditLogs.map(log => (
              <div key={log.id} className="px-5 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-white">
                      {log.summary}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      By{" "}
                      <span className="font-semibold text-slate-200">
                        {log.actorName || log.actorEmail}
                      </span>{" "}
                      ({log.actorRole})
                    </p>

                    {log.targetEmail && (
                      <p className="mt-1 text-sm text-slate-400">
                        Target: {log.targetEmail}
                      </p>
                    )}

                    {log.details && (
                      <p className="mt-2 rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-300">
                        {log.details}
                      </p>
                    )}
                  </div>

                  <div className="text-left md:text-right">
                    <Badge>{log.action}</Badge>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDateTime(log.createdAt)}
                    </p>
                    {log.ipAddress && (
                      <p className="mt-1 text-xs text-slate-600">
                        IP: {log.ipAddress}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminNavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-left text-sm font-semibold ${
        active
          ? "bg-blue-600 text-white"
          : "text-slate-300 hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300">
      {children}
    </span>
  );
}

function PermissionCheckbox({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function DarkInput({
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
  step,
  disabled = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  max?: string | number;
  step?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      value={value}
      type={type}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      onChange={event => onChange(event.target.value)}
      className={`w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 disabled:bg-slate-800 disabled:text-slate-500 ${className}`}
    />
  );
}

function DarkSelect({
  value,
  onChange,
  children,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={event => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
    >
      {children}
    </select>
  );
}

function DarkTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={event => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
    />
  );
}

function formatStatus(value: string) {
  return value === "PastDue" ? "Past Due" : value;
}

function formatDiscount(user: AdminUser) {
  if (user.discountType === "None") {
    return "No discount";
  }

  if (user.discountType === "Percentage") {
    return `${user.discountValue}% off`;
  }

  return `£${user.discountValue} off`;
}

function summarisePermissions(user: AdminUser) {
  if (user.role === "Director") {
    return "Full access";
  }

  const count = [
    user.canManageAccounts,
    user.canManageStaff,
    user.canManageBilling,
    user.canManageSecurity,
    user.canViewAuditLogs,
  ].filter(Boolean).length;

  return `${count} permissions`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== ""
    ? error.message
    : fallback;
}