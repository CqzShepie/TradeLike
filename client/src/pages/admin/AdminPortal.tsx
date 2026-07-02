import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../services/adminService";
import { authService } from "../../services/authService";
import type {
  AdminAccountStatus,
  AdminAuditLog,
  AdminDiscountType,
  AdminUser,
  BillingStatus,
  HealthStatus,
  StaffRole,
  SubscriptionPlan,
} from "../../types/admin";
import {
  accountStatuses,
  billingStatuses,
  blankPermissions,
  discountTypes,
  permanentDirectorEmail,
  staffRoles,
  staffStatuses,
  subscriptionPlans,
} from "./adminPortalConstants";
import {
  allPermissions,
  formatDateTime,
  formatStatus,
  getErrorMessage,
  getPermissionsFromUser,
  toDateInput,
  toStaffRole,
} from "./adminPortalHelpers";
import type { AdminSection, PermissionFlags } from "./adminPortalTypes";
import AdminDashboard from "./AdminDashboard";
import {
  AdminNavButton,
  AuditLogRow,
  Badge,
  DarkInput,
  DarkSelect,
  DarkTextarea,
  Field,
  PermissionEditor,
  SnapshotRow,
  StaffList,
  StatCard,
} from "./adminPortalComponents";

export default function AdminPortal() {
  const currentUser = authService.getUser();

  const staffFullName = currentUser?.name?.trim() || "Staff";
  const staffFirstName = staffFullName.split(" ")[0] || "Staff";
  const staffRole = currentUser?.role || "Staff";
  const paTo = currentUser?.personalAssistantTo?.trim();
  const isDirector = staffRole === "Director";

  const canSeeAccounts =
    isDirector ||
    Boolean(currentUser?.canManageAccounts) ||
    Boolean(currentUser?.canCreateCustomers) ||
    Boolean(currentUser?.canEditCustomers) ||
    Boolean(currentUser?.canCancelCustomers) ||
    Boolean(currentUser?.canViewBilling) ||
    Boolean(currentUser?.canViewCustomerNotes);

  const canSeeStaff =
    isDirector ||
    Boolean(currentUser?.canManageStaff) ||
    Boolean(currentUser?.canViewStaff) ||
    Boolean(currentUser?.canCreateStaff) ||
    Boolean(currentUser?.canEditStaffPermissions);

  const canSeeAuditLogs = isDirector || Boolean(currentUser?.canViewAuditLogs);

  const availableSections = useMemo(() => {
    const sections: AdminSection[] = [];

    if (canSeeAccounts || canSeeStaff || canSeeAuditLogs) {
      sections.push("overview");
    }

    if (canSeeAccounts) {
      sections.push("accounts");
    }

    if (canSeeStaff) {
      sections.push("staff");
    }

    if (canSeeAuditLogs) {
      sections.push("audit");
    }

    return sections;
  }, [canSeeAccounts, canSeeAuditLogs, canSeeStaff]);

  const [activeSection, setActiveSection] = useState<AdminSection>(
    availableSections[0] ?? "overview"
  );

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [staffUsers, setStaffUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [customerTimeline, setCustomerTimeline] = useState<AdminAuditLog[]>([]);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<AdminUser | null>(null);

  const [search, setSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createStatus, setCreateStatus] = useState<AdminAccountStatus>("Trial");
  const [createBusinessName, setCreateBusinessName] = useState("");
  const [createOwnerName, setCreateOwnerName] = useState("");
  const [createOwnerPhone, setCreateOwnerPhone] = useState("");
  const [createSubscriptionPlan, setCreateSubscriptionPlan] = useState<SubscriptionPlan>("Solo");
  const [createBillingStatus, setCreateBillingStatus] = useState<BillingStatus>("Trial");
  const [createTrialEndsAt, setCreateTrialEndsAt] = useState("");
  const [createFreeMonthsExpireAt, setCreateFreeMonthsExpireAt] = useState("");
  const [createAdminTags, setCreateAdminTags] = useState("");
  const [createSupportNotes, setCreateSupportNotes] = useState("");
  const [createHealthStatus, setCreateHealthStatus] = useState<HealthStatus>("Green");
  const [createAccountSource, setCreateAccountSource] = useState("");
  const [createCancelReason, setCreateCancelReason] = useState("");
  const [createNotes, setCreateNotes] = useState("");

  const [accountStatus, setAccountStatus] = useState<AdminAccountStatus>("Trial");
  const [discountType, setDiscountType] = useState<AdminDiscountType>("None");
  const [discountValue, setDiscountValue] = useState("0");
  const [freeMonths, setFreeMonths] = useState("0");
  const [freeMonthsExpireAt, setFreeMonthsExpireAt] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>("Solo");
  const [billingStatus, setBillingStatus] = useState<BillingStatus>("Trial");
  const [trialEndsAt, setTrialEndsAt] = useState("");
  const [adminTags, setAdminTags] = useState("");
  const [supportNotes, setSupportNotes] = useState("");
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("Green");
  const [accountSource, setAccountSource] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [accountChangeReason, setAccountChangeReason] = useState("");
  const [sendResetLink, setSendResetLink] = useState(true);
  const [forcePasswordReset, setForcePasswordReset] = useState(false);

  const [createStaffFirstName, setCreateStaffFirstName] = useState("");
  const [createStaffLastName, setCreateStaffLastName] = useState("");
  const [createStaffEmail, setCreateStaffEmail] = useState("");
  const [createStaffRole, setCreateStaffRole] = useState<StaffRole>("Support");
  const [createStaffPaTo, setCreateStaffPaTo] = useState("");
  const [createStaffPermissions, setCreateStaffPermissions] = useState<PermissionFlags>(blankPermissions);
  const [createStaffNotes, setCreateStaffNotes] = useState("");

  const [staffEditRole, setStaffEditRole] = useState<StaffRole>("Support");
  const [staffEditPaTo, setStaffEditPaTo] = useState("");
  const [staffEditStatus, setStaffEditStatus] = useState<AdminAccountStatus>("Active");
  const [staffEditPermissions, setStaffEditPermissions] = useState<PermissionFlags>(blankPermissions);
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
      cancelled: users.filter(user => user.accountStatus === "Cancelled").length,
    };
  }, [users]);

  const filteredStaffUsers = useMemo(() => {
    const query = staffSearch.trim().toLowerCase();
    const filtered = query === "" ? staffUsers : staffUsers.filter(user =>
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      user.accountStatus.toLowerCase().includes(query) ||
      (user.personalAssistantTo ?? "").toLowerCase().includes(query)
    );

    return {
      current: filtered.filter(user => user.accountStatus !== "Cancelled"),
      previous: filtered.filter(user => user.accountStatus === "Cancelled"),
    };
  }, [staffSearch, staffUsers]);

  useEffect(() => {
    if (!availableSections.includes(activeSection)) {
      setActiveSection(availableSections[0] ?? "overview");
    }
  }, [activeSection, availableSections]);

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

  function showError(value: string) {
    setError(value);
    setMessage("");
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }

  function showMessage(value: string) {
    setMessage(value);
    setError("");
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }

  async function refreshAuditLogs() {
    if (canSeeAuditLogs) {
      await loadAuditLogs(auditSearch);
    }
  }

  async function loadUsers(searchTerm = search) {
    if (!canSeeAccounts) {
      return;
    }
    try {
      setLoadingUsers(true);
      setError("");
      setUsers(await adminService.getUsers(searchTerm));
    } catch (err) {
      showError(getErrorMessage(err, "Unable to load customer accounts."));
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
      setStaffUsers(await adminService.getStaff());
    } catch (err) {
      showError(getErrorMessage(err, "Unable to load staff users."));
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
      setAuditLogs(await adminService.getAuditLogs(searchTerm));
    } catch (err) {
      showError(getErrorMessage(err, "Unable to load audit logs."));
    } finally {
      setLoadingAuditLogs(false);
    }
  }

  async function loadCustomerTimeline(userId: number) {
    try {
      setLoadingTimeline(true);
      setCustomerTimeline(await adminService.getCustomerTimeline(userId));
    } catch {
      setCustomerTimeline([]);
    } finally {
      setLoadingTimeline(false);
    }
  }

  function selectUser(user: AdminUser) {
    if (selectedUser?.id === user.id) {
      setSelectedUser(null);
      setCustomerTimeline([]);
      return;
    }
    setSelectedUser(user);
    fillSelectedUserForm(user);
    setError("");
    setMessage("");
    loadCustomerTimeline(user.id);
  }

  function fillSelectedUserForm(user: AdminUser) {
    setAccountStatus(user.accountStatus);
    setDiscountType(user.discountType);
    setDiscountValue(String(user.discountValue ?? 0));
    setFreeMonths(String(user.freeMonths ?? 0));
    setFreeMonthsExpireAt(toDateInput(user.freeMonthsExpireAt));
    setBusinessName(user.businessName ?? "");
    setOwnerName(user.ownerName ?? "");
    setOwnerPhone(user.ownerPhone ?? "");
    setSubscriptionPlan(user.subscriptionPlan);
    setBillingStatus(user.billingStatus);
    setTrialEndsAt(toDateInput(user.trialEndsAt));
    setAdminTags(user.adminTags ?? "");
    setSupportNotes(user.supportNotes ?? "");
    setHealthStatus(user.healthStatus);
    setAccountSource(user.accountSource ?? "");
    setCancelReason(user.cancelReason ?? "");
    setAdminNotes(user.adminNotes ?? "");
    setAccountChangeReason("");
    setSendResetLink(true);
    setForcePasswordReset(false);
  }

  function selectStaff(user: AdminUser) {
    if (selectedStaff?.id === user.id) {
      setSelectedStaff(null);
      return;
    }
    setSelectedStaff(user);
    fillSelectedStaffForm(user);
    setError("");
    setMessage("");
  }

  function fillSelectedStaffForm(user: AdminUser) {
    setStaffEditRole(toStaffRole(user.role));
    setStaffEditPaTo(user.personalAssistantTo ?? "");
    setStaffEditStatus(user.accountStatus);
    setStaffEditPermissions(getPermissionsFromUser(user));
    setStaffEditNotes(user.adminNotes ?? "");
  }

  function upsertUser(user: AdminUser) {
    setUsers(previous => previous.some(existing => existing.id === user.id)
      ? previous.map(existing => (existing.id === user.id ? user : existing))
      : [user, ...previous]);
  }

  function upsertStaff(user: AdminUser) {
    setStaffUsers(previous => previous.some(existing => existing.id === user.id)
      ? previous.map(existing => (existing.id === user.id ? user : existing))
      : [user, ...previous]);
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
    if (createFirstName.trim() === "" || createLastName.trim() === "") {
      showError("Customer first and last name are required.");
      return;
    }
    if (!createEmail.includes("@")) {
      showError("A valid customer email address is required.");
      return;
    }
    if ((createStatus === "Cancelled" || createBillingStatus === "Cancelled") && createCancelReason.trim() === "") {
      showError("Cancel reason is required when creating a cancelled account.");
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
        password: "",
        accountStatus: createStatus,
        businessName: createBusinessName,
        ownerName: createOwnerName,
        ownerPhone: createOwnerPhone,
        subscriptionPlan: createSubscriptionPlan,
        billingStatus: createBillingStatus,
        trialEndsAt: createTrialEndsAt,
        freeMonthsExpireAt: createFreeMonthsExpireAt,
        adminTags: createAdminTags,
        supportNotes: createSupportNotes,
        healthStatus: createHealthStatus,
        accountSource: createAccountSource,
        cancelReason: createCancelReason,
        adminNotes: createNotes,
      });
      setUsers(previous => [created, ...previous]);
      selectUser(created);
      setCreateFirstName("");
      setCreateLastName("");
      setCreateEmail("");
      setCreateStatus("Trial");
      setCreateBusinessName("");
      setCreateOwnerName("");
      setCreateOwnerPhone("");
      setCreateSubscriptionPlan("Solo");
      setCreateBillingStatus("Trial");
      setCreateTrialEndsAt("");
      setCreateFreeMonthsExpireAt("");
      setCreateAdminTags("");
      setCreateSupportNotes("");
      setCreateHealthStatus("Green");
      setCreateAccountSource("");
      setCreateCancelReason("");
      setCreateNotes("");
      showMessage(`Created customer account for ${created.email}. A password setup link has been sent if notifications are configured.`);
      await refreshAuditLogs();
    } catch (err) {
      showError(getErrorMessage(err, "Unable to create customer account."));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAccount(event: FormEvent) {
    event.preventDefault();
    if (!selectedUser) {
      return;
    }
    if ((accountStatus === "Cancelled" || billingStatus === "Cancelled") && cancelReason.trim() === "") {
      showError("Cancel reason is required when cancelling an account.");
      return;
    }
    if (accountChangeReason.trim() === "") {
      showError("Reason is required before saving sensitive Studio account changes.");
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
        freeMonthsExpireAt,
        businessName,
        ownerName,
        ownerPhone,
        subscriptionPlan,
        billingStatus,
        trialEndsAt,
        adminTags,
        supportNotes,
        healthStatus,
        accountSource,
        cancelReason,
        adminNotes,
        reason: accountChangeReason,
      });
      upsertUser(updated);
      setSelectedUser(updated);
      fillSelectedUserForm(updated);
      showMessage(`Updated customer account for ${updated.email}.`);
      await loadCustomerTimeline(updated.id);
      await refreshAuditLogs();
    } catch (err) {
      showError(getErrorMessage(err, "Unable to update customer account."));
    } finally {
      setSaving(false);
    }
  }

  async function handleReactivateCustomer() {
    if (!selectedUser) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const updated = await adminService.reactivateCustomer(selectedUser.id);
      upsertUser(updated);
      setSelectedUser(updated);
      fillSelectedUserForm(updated);
      showMessage(`Reactivated customer account for ${updated.email}.`);
      await loadCustomerTimeline(updated.id);
      await refreshAuditLogs();
    } catch (err) {
      showError(getErrorMessage(err, "Unable to reactivate customer."));
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(event: FormEvent) {
    event.preventDefault();
    if (!selectedUser) {
      return;
    }
    if (!sendResetLink && !forcePasswordReset) {
      showError("Choose at least one password reset action.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const response = await adminService.resetPassword(selectedUser.id, { sendResetLink, forcePasswordReset });
      const updated = response.user;
      upsertUser(updated);
      setSelectedUser(updated);
      fillSelectedUserForm(updated);
      showMessage(response.message);
      await loadCustomerTimeline(updated.id);
      await refreshAuditLogs();
    } catch (err) {
      showError(getErrorMessage(err, "Unable to reset password."));
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
      setSelectedUser(updated);
      fillSelectedUserForm(updated);
      showMessage(`${updated.email} is now marked as verified.`);
      await loadCustomerTimeline(updated.id);
      await refreshAuditLogs();
    } catch (err) {
      showError(getErrorMessage(err, "Unable to mark email as verified."));
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
      setSelectedUser(response.user);
      fillSelectedUserForm(response.user);
      showMessage(response.message);
      await loadCustomerTimeline(response.user.id);
      await refreshAuditLogs();
    } catch (err) {
      showError(getErrorMessage(err, "Unable to send verification email."));
    } finally {
      setSaving(false);
    }
  }

  async function handleSendOnboardingEmail() {
    if (!selectedUser) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const response = await adminService.sendOnboardingEmail(selectedUser.id);
      upsertUser(response.user);
      setSelectedUser(response.user);
      fillSelectedUserForm(response.user);
      showMessage(response.message);
      await loadCustomerTimeline(response.user.id);
      await refreshAuditLogs();
    } catch (err) {
      showError(getErrorMessage(err, "Unable to send onboarding email."));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateStaff(event: FormEvent) {
    event.preventDefault();
    if (createStaffFirstName.trim() === "" || createStaffLastName.trim() === "") {
      showError("Staff first and last name are required.");
      return;
    }
    if (!createStaffEmail.includes("@")) {
      showError("A valid staff email address is required.");
      return;
    }
    if (createStaffRole === "Personal Assistant" && createStaffPaTo.trim() === "") {
      showError("Personal Assistant accounts must say who they are PA to.");
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
        role: createStaffRole,
        personalAssistantTo: createStaffPaTo,
        ...createStaffPermissions,
        adminNotes: createStaffNotes,
      });
      setStaffUsers(previous => [created, ...previous]);
      setSelectedStaff(created);
      fillSelectedStaffForm(created);
      setCreateStaffFirstName("");
      setCreateStaffLastName("");
      setCreateStaffEmail("");
      setCreateStaffRole("Support");
      setCreateStaffPaTo("");
      setCreateStaffPermissions(blankPermissions);
      setCreateStaffNotes("");
      showMessage(`Invite created for ${created.email}. The invite link was copied where possible.`);
      await refreshAuditLogs();
    } catch (err) {
      showError(getErrorMessage(err, "Unable to create staff account."));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveStaffPermissions(event: FormEvent) {
    event.preventDefault();
    if (!selectedStaff) {
      return;
    }
    if (staffEditRole === "Personal Assistant" && staffEditPaTo.trim() === "") {
      showError("Personal Assistant accounts must say who they are PA to.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const updated = await adminService.updateStaffPermissions(selectedStaff.id, {
        role: staffEditRole,
        personalAssistantTo: staffEditPaTo,
        accountStatus: staffEditStatus,
        ...staffEditPermissions,
        adminNotes: staffEditNotes,
      });
      upsertStaff(updated);
      setSelectedStaff(updated);
      fillSelectedStaffForm(updated);
      showMessage(`Updated staff permissions for ${updated.email}.`);
      await refreshAuditLogs();
    } catch (err) {
      showError(getErrorMessage(err, "Unable to update staff permissions."));
    } finally {
      setSaving(false);
    }
  }

  function searchAuditForStaff(user: AdminUser) {
    setActiveSection("audit");
    setAuditSearch(user.email);
    loadAuditLogs(user.email);
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <Link to="/" className="text-xl font-bold text-blue-400">TradeLike Studio</Link>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{staffRole}{paTo ? ` · PA to ${paTo}` : ""}</p>
          </div>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900">Back to Login</Link>
            <Link to="/dashboard" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Open customer app</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">TradeLike Studio</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Hello {staffFirstName}</h1>
        <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-300">{staffRole}{paTo ? ` · PA to ${paTo}` : ""}</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Manage SaaS customer accounts, staff permissions, free months, discounts, verification status, passwords, and audit logs.</p>

        {error && <div className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-medium text-red-100">{error}</div>}
        {message && <div className="mt-6 rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-sm font-medium text-green-100">{message}</div>}

        <div className="mt-8 grid gap-6 xl:grid-cols-[260px_1fr]">
          <aside className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Admin sections</p>
            <div className="mt-3 flex flex-col gap-2">
              <AdminNavButton active={activeSection === "overview"} onClick={() => setActiveSection("overview")}>Overview</AdminNavButton>
              {canSeeAccounts && <AdminNavButton active={activeSection === "accounts"} onClick={() => setActiveSection("accounts")}>Customer Accounts</AdminNavButton>}
              {canSeeStaff && <AdminNavButton active={activeSection === "staff"} onClick={() => setActiveSection("staff")}>Staff & Permissions</AdminNavButton>}
              {canSeeAuditLogs && <AdminNavButton active={activeSection === "audit"} onClick={() => setActiveSection("audit")}>Audit Logs</AdminNavButton>}
            </div>
          </aside>

          <div>
            {activeSection === "overview" && <AdminDashboard users={users} staffUsers={staffUsers} auditLogs={auditLogs} onOpenAccounts={() => setActiveSection("accounts")} onOpenAudit={() => setActiveSection("audit")} />}

            {activeSection === "accounts" && canSeeAccounts && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-6">
                  <StatCard label="Accounts" value={customerStats.total} />
                  <StatCard label="Trial" value={customerStats.trial} />
                  <StatCard label="Active" value={customerStats.active} />
                  <StatCard label="Past Due" value={customerStats.pastDue} />
                  <StatCard label="Suspended" value={customerStats.suspended} />
                  <StatCard label="Cancelled" value={customerStats.cancelled} />
                </div>

                <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                  <aside className="space-y-6">
                    <form onSubmit={handleSearch} className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
                      <h2 className="text-lg font-bold text-white">Search accounts</h2>
                      <div className="mt-4 flex gap-2"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, email, plan, status, tag" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" /><button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Search</button></div>
                    </form>

                    <form onSubmit={handleCreateUser} className="max-h-[720px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-5 pr-3 shadow-sm">
                      <h2 className="text-lg font-bold text-white">Create customer account</h2>
                      <div className="mt-4 grid gap-3">
                        <DarkInput value={createFirstName} onChange={setCreateFirstName} placeholder="First name" />
                        <DarkInput value={createLastName} onChange={setCreateLastName} placeholder="Last name" />
                        <DarkInput value={createEmail} onChange={setCreateEmail} placeholder="Email address" type="email" />
                        <p className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-100">The customer will set their own password from a secure setup link.</p>
                        <DarkInput value={createBusinessName} onChange={setCreateBusinessName} placeholder="Business name" />
                        <DarkInput value={createOwnerName} onChange={setCreateOwnerName} placeholder="Owner name" />
                        <DarkInput value={createOwnerPhone} onChange={setCreateOwnerPhone} placeholder="Owner phone" />
                        <DarkSelect value={createSubscriptionPlan} onChange={value => setCreateSubscriptionPlan(value as SubscriptionPlan)}>{subscriptionPlans.map(plan => <option key={plan} value={plan}>{plan}</option>)}</DarkSelect>
                        <DarkSelect value={createBillingStatus} onChange={value => setCreateBillingStatus(value as BillingStatus)}>{billingStatuses.map(status => <option key={status} value={status}>{formatStatus(status)}</option>)}</DarkSelect>
                        <Field label="Trial end date"><DarkInput value={createTrialEndsAt} onChange={setCreateTrialEndsAt} type="date" /></Field>
                        <Field label="Free months expiry"><DarkInput value={createFreeMonthsExpireAt} onChange={setCreateFreeMonthsExpireAt} type="date" /></Field>
                        <DarkInput value={createAdminTags} onChange={setCreateAdminTags} placeholder="Tags, comma separated" />
                        {(createStatus === "Cancelled" || createBillingStatus === "Cancelled") && <DarkTextarea value={createCancelReason} onChange={setCreateCancelReason} placeholder="Cancel reason" rows={3} />}
                        <DarkTextarea value={createSupportNotes} onChange={setCreateSupportNotes} placeholder="Support notes" rows={4} />
                        <DarkTextarea value={createNotes} onChange={setCreateNotes} placeholder="Internal admin notes" rows={4} />
                        <button type="submit" disabled={saving} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300">{saving ? "Creating..." : "Create Customer"}</button>
                      </div>
                    </form>
                  </aside>

                  <div className="space-y-6">
                    <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
                      <div className="border-b border-slate-800 px-5 py-4"><h2 className="text-lg font-bold text-white">Customer accounts</h2><p className="mt-1 text-sm text-slate-400">Click a selected customer again to hide their details.</p></div>
                      {loadingUsers ? <div className="p-5 text-sm text-slate-400">Loading...</div> : users.length === 0 ? <div className="p-5 text-sm text-slate-400">No customer accounts found.</div> : <div className="max-h-[520px] divide-y divide-slate-800 overflow-y-auto">{users.map(user => <button key={user.id} type="button" onClick={() => selectUser(user)} className={`grid w-full gap-3 px-5 py-4 text-left hover:bg-slate-800 md:grid-cols-[1fr_120px_120px_130px] ${selectedUser?.id === user.id ? "bg-slate-800" : ""}`}><div><p className="font-semibold text-white">{user.businessName || user.fullName || user.email}</p><p className="mt-1 text-sm text-slate-400">{user.email}</p></div><Badge>{formatStatus(user.accountStatus)}</Badge><Badge>{formatStatus(user.billingStatus)}</Badge><Badge>{user.subscriptionPlan}</Badge></button>)}</div>}
                    </div>

                    {selectedUser && (
                      <div className="grid gap-6 xl:grid-cols-2">
                        <form onSubmit={handleSaveAccount} className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
                          <h2 className="text-lg font-bold text-white">Manage customer</h2><p className="mt-1 text-sm text-slate-400">{selectedUser.email}</p>
                          <div className="mt-5 grid gap-4">
                            <Field label="Business name"><DarkInput value={businessName} onChange={setBusinessName} /></Field>
                            <Field label="Owner name"><DarkInput value={ownerName} onChange={setOwnerName} /></Field>
                            <Field label="Owner phone"><DarkInput value={ownerPhone} onChange={setOwnerPhone} /></Field>
                            <Field label="Account status"><DarkSelect value={accountStatus} onChange={value => setAccountStatus(value as AdminAccountStatus)}>{accountStatuses.map(status => <option key={status} value={status}>{formatStatus(status)}</option>)}</DarkSelect></Field>
                            <Field label="Subscription plan"><DarkSelect value={subscriptionPlan} onChange={value => setSubscriptionPlan(value as SubscriptionPlan)}>{subscriptionPlans.map(plan => <option key={plan} value={plan}>{plan}</option>)}</DarkSelect></Field>
                            <Field label="Billing status"><DarkSelect value={billingStatus} onChange={value => setBillingStatus(value as BillingStatus)}>{billingStatuses.map(status => <option key={status} value={status}>{formatStatus(status)}</option>)}</DarkSelect></Field>
                            <Field label="Trial end date"><DarkInput value={trialEndsAt} onChange={setTrialEndsAt} type="date" /></Field>
                            <Field label="Discount type"><DarkSelect value={discountType} onChange={value => setDiscountType(value as AdminDiscountType)}>{discountTypes.map(type => <option key={type} value={type}>{type === "None" ? "No discount" : type === "Amount" ? "£ amount" : "% percentage"}</option>)}</DarkSelect></Field>
                            <Field label={discountType === "Percentage" ? "Discount value (%)" : "Discount value (£)"}><DarkInput value={discountValue} onChange={setDiscountValue} type="number" min="0" max={discountType === "Percentage" ? 100 : undefined} step="1" disabled={discountType === "None"} /></Field>
                            <Field label="Free months"><DarkInput value={freeMonths} onChange={setFreeMonths} type="number" min="0" max="24" step="1" /></Field>
                            <Field label="Free months expiry"><DarkInput value={freeMonthsExpireAt} onChange={setFreeMonthsExpireAt} type="date" /></Field>
                            <Field label="Tags"><DarkInput value={adminTags} onChange={setAdminTags} placeholder="High Value, Setup Help, Churn Risk" /></Field>
                            {(accountStatus === "Cancelled" || billingStatus === "Cancelled") && <Field label="Cancel reason"><DarkTextarea value={cancelReason} onChange={setCancelReason} rows={4} /></Field>}
                            <Field label="Support notes"><DarkTextarea value={supportNotes} onChange={setSupportNotes} rows={6} /></Field>
                            <Field label="Internal admin notes"><DarkTextarea value={adminNotes} onChange={setAdminNotes} rows={5} /></Field>
                            <Field label="Reason for change"><DarkTextarea value={accountChangeReason} onChange={setAccountChangeReason} placeholder="Required for audit log. Example: Customer requested Team plan during support call." rows={4} /></Field>
                            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600">{saving ? "Saving..." : "Save Customer Changes"}</button>
                            {(selectedUser.accountStatus === "Cancelled" || selectedUser.billingStatus === "Cancelled") && <button type="button" onClick={handleReactivateCustomer} disabled={saving} className="rounded-lg border border-green-500/50 px-4 py-2 text-sm font-semibold text-green-200 hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-50">Reactivate Customer</button>}
                          </div>
                        </form>

                        <div className="space-y-6">
                          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"><h2 className="text-lg font-bold text-white">Account actions</h2><div className="mt-4 grid gap-3"><button type="button" onClick={handleMarkVerified} disabled={saving || selectedUser.isEmailVerified} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{selectedUser.isEmailVerified ? "Email Verified" : "Mark Email Verified"}</button><button type="button" onClick={handleSendVerificationEmail} disabled={saving} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">Send Verification Email</button><button type="button" onClick={handleSendOnboardingEmail} disabled={saving} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">Send Onboarding Email</button></div></div>
                          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"><h2 className="text-lg font-bold text-white">Account snapshot</h2><div className="mt-4 grid gap-3 text-sm text-slate-400"><SnapshotRow label="Last login" value={selectedUser.lastLoginAt ? formatDateTime(selectedUser.lastLoginAt) : "Never"} /><SnapshotRow label="Trial ends" value={selectedUser.trialEndsAt ? formatDateTime(selectedUser.trialEndsAt) : "Not set"} /><SnapshotRow label="Free months expiry" value={selectedUser.freeMonthsExpireAt ? formatDateTime(selectedUser.freeMonthsExpireAt) : "Not set"} /><SnapshotRow label="Onboarding email" value={selectedUser.onboardingEmailSentAt ? formatDateTime(selectedUser.onboardingEmailSentAt) : "Not sent"} /><SnapshotRow label="Verification email" value={selectedUser.emailVerificationSentAt ? formatDateTime(selectedUser.emailVerificationSentAt) : "Never"} /></div></div>
                          <form onSubmit={handleResetPassword} className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"><h2 className="text-lg font-bold text-white">Password recovery</h2><p className="mt-1 text-sm text-slate-400">Staff can send a reset link or require a reset, but cannot set the customer's new password.</p><div className="mt-4 space-y-4"><label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={sendResetLink} onChange={event => setSendResetLink(event.target.checked)} />Send password reset link</label><label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={forcePasswordReset} onChange={event => setForcePasswordReset(event.target.checked)} />Force password reset on next sign-in</label><button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-600">{saving ? "Sending..." : "Apply password recovery"}</button></div></form>
                          <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm"><div className="border-b border-slate-800 px-5 py-4"><h2 className="text-lg font-bold text-white">Customer timeline</h2></div>{loadingTimeline ? <div className="p-5 text-sm text-slate-400">Loading...</div> : customerTimeline.length === 0 ? <div className="p-5 text-sm text-slate-400">No timeline entries yet.</div> : <div className="max-h-[360px] divide-y divide-slate-800 overflow-y-auto">{customerTimeline.map(log => <AuditLogRow key={log.id} log={log} />)}</div>}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "staff" && canSeeStaff && (
              <div className="space-y-6"><div className="grid gap-6 xl:grid-cols-[420px_1fr]"><aside className="space-y-6"><div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-lg font-bold text-white">Search staff</h2><DarkInput value={staffSearch} onChange={setStaffSearch} placeholder="Name, email, role, status, PA to" className="mt-4" /></div><form onSubmit={handleCreateStaff} className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"><h2 className="text-lg font-bold text-white">Invite staff user</h2><p className="mt-1 text-sm text-slate-400">The invitee sets their own password from the invite link.</p><div className="mt-4 grid gap-3"><DarkInput value={createStaffFirstName} onChange={setCreateStaffFirstName} placeholder="First name" /><DarkInput value={createStaffLastName} onChange={setCreateStaffLastName} placeholder="Last name" /><DarkInput value={createStaffEmail} onChange={setCreateStaffEmail} placeholder="Staff email" type="email" /><DarkSelect value={createStaffRole} onChange={value => setCreateStaffRole(value as StaffRole)}>{staffRoles.map(role => <option key={role} value={role}>{role}</option>)}</DarkSelect>{createStaffRole === "Personal Assistant" && <DarkInput value={createStaffPaTo} onChange={setCreateStaffPaTo} placeholder="PA to" />}<PermissionEditor title="Initial permissions" permissions={createStaffPermissions} setPermissions={setCreateStaffPermissions} /><DarkTextarea value={createStaffNotes} onChange={setCreateStaffNotes} placeholder="Internal staff notes" rows={4} /><button type="submit" disabled={saving} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300">{saving ? "Creating invite..." : "Create invite"}</button></div></form></aside><div className="space-y-6"><StaffList title="Current staff" subtitle="Active and suspended staff accounts. Click heading to hide selected details." users={filteredStaffUsers.current} selectedStaff={selectedStaff} loading={loadingStaff} onSelect={selectStaff} onHeaderClick={() => setSelectedStaff(null)} onAuditClick={searchAuditForStaff} emptyText="No current staff found." /><StaffList title="Previous staff" subtitle="Cancelled staff accounts are kept here for history. Click heading to hide selected details." users={filteredStaffUsers.previous} selectedStaff={selectedStaff} loading={loadingStaff} onSelect={selectStaff} onHeaderClick={() => setSelectedStaff(null)} onAuditClick={searchAuditForStaff} emptyText="No previous staff found." />{selectedStaff && <form onSubmit={handleSaveStaffPermissions} className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"><h2 className="text-lg font-bold text-white">Staff permissions</h2><p className="mt-1 text-sm text-slate-400">{selectedStaff.email}</p>{selectedStaff.email.toLowerCase() === permanentDirectorEmail && <div className="mt-4 rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 text-sm text-blue-100">Permanent Director account. Full access is protected.</div>}<div className="mt-5 grid gap-4"><Field label="Role"><DarkSelect value={selectedStaff.email.toLowerCase() === permanentDirectorEmail ? "Director" : staffEditRole} onChange={value => setStaffEditRole(value as StaffRole)} disabled={selectedStaff.email.toLowerCase() === permanentDirectorEmail}>{staffRoles.map(role => <option key={role} value={role}>{role}</option>)}</DarkSelect></Field>{staffEditRole === "Personal Assistant" && <Field label="PA to"><DarkInput value={staffEditPaTo} onChange={setStaffEditPaTo} disabled={selectedStaff.email.toLowerCase() === permanentDirectorEmail} /></Field>}<Field label="Status"><DarkSelect value={selectedStaff.email.toLowerCase() === permanentDirectorEmail ? "Active" : staffEditStatus} onChange={value => setStaffEditStatus(value as AdminAccountStatus)} disabled={selectedStaff.email.toLowerCase() === permanentDirectorEmail}>{staffStatuses.map(status => <option key={status} value={status}>{formatStatus(status)}</option>)}</DarkSelect></Field><PermissionEditor title="Permissions" permissions={selectedStaff.email.toLowerCase() === permanentDirectorEmail ? allPermissions() : staffEditPermissions} setPermissions={setStaffEditPermissions} disabled={selectedStaff.email.toLowerCase() === permanentDirectorEmail} /><Field label="Internal staff notes"><DarkTextarea value={staffEditNotes} onChange={setStaffEditNotes} rows={5} /></Field></div><button type="submit" disabled={saving} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600">{saving ? "Saving..." : "Save Staff Permissions"}</button></form>}</div></div></div>
            )}

            {activeSection === "audit" && canSeeAuditLogs && (
              <div className="space-y-6"><form onSubmit={handleAuditSearch} className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"><h2 className="text-lg font-bold text-white">Audit Logs</h2><div className="mt-4 flex gap-2"><input value={auditSearch} onChange={event => setAuditSearch(event.target.value)} placeholder="Search staff member, email, role, target, action" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" /><button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Search</button></div></form><div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm"><div className="border-b border-slate-800 px-5 py-4"><h2 className="text-lg font-bold text-white">Latest admin actions</h2></div>{loadingAuditLogs ? <div className="p-5 text-sm text-slate-400">Loading...</div> : auditLogs.length === 0 ? <div className="p-5 text-sm text-slate-400">No audit logs found yet.</div> : <div className="max-h-[680px] divide-y divide-slate-800 overflow-y-auto">{auditLogs.map(log => <AuditLogRow key={log.id} log={log} />)}</div>}</div></div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
