import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Sidebar from "../components/layout/Sidebar";
import { adminService } from "../services/adminService";
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
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <main className="md:pl-64">
        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                TradeLike admin
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                Admin Portal
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Manage SaaS customer accounts, free months, discounts,
                verification status, passwords, and internal notes.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Admin-only area. Destructive billing actions should get audit logs
              later.
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <StatCard label="Accounts" value={stats.total} />
            <StatCard label="Trial" value={stats.trial} />
            <StatCard label="Active" value={stats.active} />
            <StatCard label="Suspended" value={stats.suspended} />
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
              {message}
            </div>
          )}

          <div className="mt-8 grid gap-6 xl:grid-cols-[420px_1fr]">
            <aside className="space-y-6">
              <form
                onSubmit={handleSearch}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h2 className="text-lg font-bold text-slate-900">
                  Search accounts
                </h2>

                <div className="mt-4 flex gap-2">
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Name, email, or status"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
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
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h2 className="text-lg font-bold text-slate-900">
                  Create account
                </h2>

                <div className="mt-4 grid gap-3">
                  <input
                    value={createFirstName}
                    onChange={event => setCreateFirstName(event.target.value)}
                    placeholder="First name"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                  />

                  <input
                    value={createLastName}
                    onChange={event => setCreateLastName(event.target.value)}
                    placeholder="Last name"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                  />

                  <input
                    value={createEmail}
                    onChange={event => setCreateEmail(event.target.value)}
                    placeholder="Email address"
                    type="email"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                  />

                  <input
                    value={createPassword}
                    onChange={event => setCreatePassword(event.target.value)}
                    placeholder="Temporary password"
                    type="password"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                  />

                  <select
                    value={createStatus}
                    onChange={event =>
                      setCreateStatus(event.target.value as AdminAccountStatus)
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
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
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                  />

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {saving ? "Creating..." : "Create Account"}
                  </button>
                </div>
              </form>
            </aside>

            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    Accounts
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select an account to manage subscription controls.
                  </p>
                </div>

                {loading ? (
                  <div className="p-5 text-sm text-slate-500">Loading...</div>
                ) : users.length === 0 ? (
                  <div className="p-5 text-sm text-slate-500">
                    No accounts found.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {users.map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => selectUser(user)}
                        className={`grid w-full gap-3 px-5 py-4 text-left hover:bg-blue-50 md:grid-cols-[1fr_160px_120px_120px] ${
                          selectedUser?.id === user.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {user.fullName || user.email}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
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
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <h2 className="text-lg font-bold text-slate-900">
                      Manage account
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
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
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
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
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
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
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100"
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
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                        />
                      </Field>

                      <Field label="Internal admin notes">
                        <textarea
                          value={adminNotes}
                          onChange={event => setAdminNotes(event.target.value)}
                          rows={6}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                        />
                      </Field>

                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {saving ? "Saving..." : "Save Account Changes"}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h2 className="text-lg font-bold text-slate-900">
                        Verification
                      </h2>

                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <p>
                          Status:{" "}
                          <span className="font-semibold text-slate-900">
                            {selectedUser.isEmailVerified
                              ? "Verified"
                              : "Unverified"}
                          </span>
                        </p>

                        <p>
                          Last verification send action:{" "}
                          <span className="font-semibold text-slate-900">
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
                          className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Send verification email
                        </button>

                        <button
                          type="button"
                          onClick={handleMarkVerified}
                          disabled={saving || selectedUser.isEmailVerified}
                          className="rounded-lg border border-green-200 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Mark verified
                        </button>
                      </div>
                    </div>

                    <form
                      onSubmit={handleResetPassword}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <h2 className="text-lg font-bold text-slate-900">
                        Reset password
                      </h2>

                      <div className="mt-4 space-y-4">
                        <input
                          value={newPassword}
                          onChange={event => setNewPassword(event.target.value)}
                          type="password"
                          placeholder="New temporary password"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                        />

                        <label className="flex items-center gap-2 text-sm text-slate-700">
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
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
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
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
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