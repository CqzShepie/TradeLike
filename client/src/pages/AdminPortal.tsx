import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../services/adminService";
import { authService } from "../services/authService";
import type {
  AdminAccountStatus,
  AdminDiscountType,
  AdminUser,
} from "../types/admin";

const accountStatuses: AdminAccountStatus[] = [
  "Trial",
  "Active",
  "PastDue",
  "Suspended",
  "Cancelled",
];

const discountTypes: AdminDiscountType[] = ["None", "Amount", "Percentage"];

export default function AdminPortal() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
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

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const currentUser = authService.getUser();
  const fullStaffName = currentUser?.name?.trim() || "Staff";
  const staffName = fullStaffName.split(" ")[0] || "Staff";
  const staffRole = currentUser?.role || "Staff";

  async function loadUsers(searchTerm = search) {
    try {
      setLoading(true);
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
      setError(getErrorMessage(err, "Unable to load admin users."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    return {
      total: users.length,
      trial: users.filter(user => user.accountStatus === "Trial").length,
      active: users.filter(user => user.accountStatus === "Active").length,
      pastDue: users.filter(user => user.accountStatus === "PastDue").length,
      suspended: users.filter(user => user.accountStatus === "Suspended").length,
    };
  }, [users]);

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

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    await loadUsers(search);
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

      setMessage(`Created account for ${created.email}.`);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create account."));
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
      setMessage(`Updated account for ${updated.email}.`);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update account."));
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
    } catch (err) {
      setError(getErrorMessage(err, "Unable to send verification email."));
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <Link to="/" className="text-xl font-bold text-blue-400">
              TradeLike
            </Link>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Staff Admin Portal
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
          Hello {staffName}
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
            Staff-only area. Later we should add audit logs for every admin
            action.
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <StatCard label="Accounts" value={stats.total} />
          <StatCard label="Trial" value={stats.trial} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Past Due" value={stats.pastDue} />
          <StatCard label="Suspended" value={stats.suspended} />
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

        <div className="mt-8 grid gap-6 xl:grid-cols-[420px_1fr]">
          <aside className="space-y-6">
            <form
              onSubmit={handleSearch}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold text-white">
                Search accounts
              </h2>

              <div className="mt-4 flex gap-2">
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
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
              onSubmit={handleCreateUser}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold text-white">Create account</h2>

              <div className="mt-4 grid gap-3">
                <input
                  value={createFirstName}
                  onChange={event => setCreateFirstName(event.target.value)}
                  placeholder="First name"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />

                <input
                  value={createLastName}
                  onChange={event => setCreateLastName(event.target.value)}
                  placeholder="Last name"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />

                <input
                  value={createEmail}
                  onChange={event => setCreateEmail(event.target.value)}
                  placeholder="Email address"
                  type="email"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />

                <input
                  value={createPassword}
                  onChange={event => setCreatePassword(event.target.value)}
                  placeholder="Temporary password"
                  type="password"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />

                <select
                  value={createStatus}
                  onChange={event =>
                    setCreateStatus(event.target.value as AdminAccountStatus)
                  }
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                >
                  {accountStatuses.map(status => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>

                <textarea
                  value={createNotes}
                  onChange={event => setCreateNotes(event.target.value)}
                  placeholder="Internal admin notes"
                  rows={4}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                >
                  {saving ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </aside>

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
              <div className="border-b border-slate-800 px-5 py-4">
                <h2 className="text-lg font-bold text-white">Accounts</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Select an account to manage subscription controls.
                </p>
              </div>

              {loading ? (
                <div className="p-5 text-sm text-slate-400">Loading...</div>
              ) : users.length === 0 ? (
                <div className="p-5 text-sm text-slate-400">
                  No accounts found.
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {users.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => selectUser(user)}
                      className={`grid w-full gap-3 px-5 py-4 text-left hover:bg-slate-800 md:grid-cols-[1fr_160px_120px_140px] ${
                        selectedUser?.id === user.id ? "bg-slate-800" : ""
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

                      <Badge>
                        {user.isEmailVerified ? "Verified" : "Unverified"}
                      </Badge>

                      <Badge>
                        {user.discountType === "None"
                          ? "No discount"
                          : user.discountType === "Percentage"
                          ? `${user.discountValue}% off`
                          : `£${user.discountValue} off`}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedUser && (
              <div className="grid gap-6 xl:grid-cols-2">
                <form
                  onSubmit={handleSaveAccount}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
                >
                  <h2 className="text-lg font-bold text-white">
                    Manage account
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedUser.email}
                  </p>

                  <div className="mt-5 grid gap-4">
                    <Field label="Account status">
                      <select
                        value={accountStatus}
                        onChange={event =>
                          setAccountStatus(
                            event.target.value as AdminAccountStatus
                          )
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                      >
                        {accountStatuses.map(status => (
                          <option key={status} value={status}>
                            {formatStatus(status)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Discount type">
                      <select
                        value={discountType}
                        onChange={event =>
                          setDiscountType(
                            event.target.value as AdminDiscountType
                          )
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
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
                      </select>
                    </Field>

                    <Field
                      label={
                        discountType === "Percentage"
                          ? "Discount value (%)"
                          : "Discount value (£)"
                      }
                    >
                      <input
                        value={discountValue}
                        onChange={event => setDiscountValue(event.target.value)}
                        disabled={discountType === "None"}
                        type="number"
                        min="0"
                        max={discountType === "Percentage" ? 100 : undefined}
                        step="1"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
                      />
                    </Field>

                    <Field label="Free months">
                      <input
                        value={freeMonths}
                        onChange={event => setFreeMonths(event.target.value)}
                        type="number"
                        min="0"
                        max="120"
                        step="1"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                      />
                    </Field>

                    <Field label="Internal admin notes">
                      <textarea
                        value={adminNotes}
                        onChange={event => setAdminNotes(event.target.value)}
                        rows={6}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                      />
                    </Field>

                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                    >
                      {saving ? "Saving..." : "Save Account Changes"}
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
                          {selectedUser.isEmailVerified
                            ? "Verified"
                            : "Unverified"}
                        </span>
                      </p>

                      <p>
                        Last verification send action:{" "}
                        <span className="font-semibold text-white">
                          {selectedUser.emailVerificationSentAt
                            ? formatDateTime(selectedUser.emailVerificationSentAt)
                            : "Never"}
                        </span>
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSendVerificationEmail}
                        disabled={saving}
                        className="rounded-lg border border-blue-500/50 px-3 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Send verification email
                      </button>

                      <button
                        type="button"
                        onClick={handleMarkVerified}
                        disabled={saving || selectedUser.isEmailVerified}
                        className="rounded-lg border border-green-500/50 px-3 py-2 text-xs font-semibold text-green-200 hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Mark verified
                      </button>
                    </div>
                  </div>

                  <form
                    onSubmit={handleResetPassword}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
                  >
                    <h2 className="text-lg font-bold text-white">
                      Reset password
                    </h2>

                    <div className="mt-4 space-y-4">
                      <input
                        value={newPassword}
                        onChange={event => setNewPassword(event.target.value)}
                        type="password"
                        placeholder="New temporary password"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                      />

                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={requirePasswordReset}
                          onChange={event =>
                            setRequirePasswordReset(event.target.checked)
                          }
                        />
                        Require password reset on next login
                      </label>

                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                      >
                        {saving ? "Updating..." : "Reset Password"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
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

function formatStatus(value: string) {
  return value === "PastDue" ? "Past Due" : value;
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