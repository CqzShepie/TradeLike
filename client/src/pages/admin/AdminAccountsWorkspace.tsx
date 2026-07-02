import { useEffect, useMemo, useState } from "react";
import { adminService } from "../../services/adminService";
import type { AdminAccountStatus, AdminAuditLog, AdminDiscountType, AdminUser, BillingStatus, HealthStatus, SubscriptionPlan } from "../../types/admin";
import { accountStatuses, billingStatuses, discountTypes, subscriptionPlans } from "./adminPortalConstants";
import { formatDateTime, formatStatus, getErrorMessage, toDateInput } from "./adminPortalHelpers";
import { Badge, DarkInput, DarkSelect, DarkTextarea, Field, StatCard } from "./adminPortalComponents";

export default function AdminAccountsWorkspace() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [timeline, setTimeline] = useState<AdminAuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [accountStatus, setAccountStatus] = useState<AdminAccountStatus>("Trial");
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>("Solo");
  const [billingStatus, setBillingStatus] = useState<BillingStatus>("Trial");
  const [trialEndsAt, setTrialEndsAt] = useState("");
  const [discountType, setDiscountType] = useState<AdminDiscountType>("None");
  const [discountValue, setDiscountValue] = useState("0");
  const [freeMonths, setFreeMonths] = useState("0");
  const [freeMonthsExpireAt, setFreeMonthsExpireAt] = useState("");
  const [adminTags, setAdminTags] = useState("");
  const [supportNotes, setSupportNotes] = useState("");
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("Green");
  const [accountSource, setAccountSource] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [changeReason, setChangeReason] = useState("");

  const stats = useMemo(() => ({
    total: users.length,
    trial: users.filter(user => user.accountStatus === "Trial").length,
    active: users.filter(user => user.accountStatus === "Active").length,
    pastDue: users.filter(user => user.accountStatus === "PastDue" || user.billingStatus === "PastDue").length,
    suspended: users.filter(user => user.accountStatus === "Suspended").length,
    cancelled: users.filter(user => user.accountStatus === "Cancelled").length,
  }), [users]);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers(searchTerm = search) {
    try {
      setLoading(true);
      setError("");
      setUsers(await adminService.getUsers(searchTerm));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load customer accounts."));
    } finally {
      setLoading(false);
    }
  }

  async function selectUser(user: AdminUser) {
    setSelected(user);
    fillForm(user);
    setMessage("");
    setError("");
    try {
      setTimeline(await adminService.getCustomerTimeline(user.id));
    } catch {
      setTimeline([]);
    }
  }

  function fillForm(user: AdminUser) {
    setAccountStatus(user.accountStatus);
    setBusinessName(user.businessName ?? "");
    setOwnerName(user.ownerName ?? "");
    setOwnerPhone(user.ownerPhone ?? "");
    setSubscriptionPlan(user.subscriptionPlan);
    setBillingStatus(user.billingStatus);
    setTrialEndsAt(toDateInput(user.trialEndsAt));
    setDiscountType(user.discountType);
    setDiscountValue(String(user.discountValue ?? 0));
    setFreeMonths(String(user.freeMonths ?? 0));
    setFreeMonthsExpireAt(toDateInput(user.freeMonthsExpireAt));
    setAdminTags(user.adminTags ?? "");
    setSupportNotes(user.supportNotes ?? "");
    setHealthStatus(user.healthStatus);
    setAccountSource(user.accountSource ?? "");
    setCancelReason(user.cancelReason ?? "");
    setAdminNotes(user.adminNotes ?? "");
    setChangeReason("");
  }

  async function saveAccount(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (changeReason.trim() === "") {
      setError("Reason is required before saving sensitive Studio account changes.");
      setMessage("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const updated = await adminService.updateAccount(selected.id, {
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
        reason: changeReason,
      });
      setUsers(previous => previous.map(user => user.id === updated.id ? updated : user));
      setSelected(updated);
      fillForm(updated);
      setMessage(`Saved ${updated.email}.`);
      setTimeline(await adminService.getCustomerTimeline(updated.id));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save customer account."));
    } finally {
      setSaving(false);
    }
  }

  async function runCustomerAction(action: "verify" | "verification" | "onboarding" | "reactivate") {
    if (!selected) return;
    try {
      setSaving(true);
      setError("");
      let updated = selected;
      if (action === "verify") updated = await adminService.markEmailVerified(selected.id);
      if (action === "verification") updated = (await adminService.sendVerificationEmail(selected.id)).user;
      if (action === "onboarding") updated = (await adminService.sendOnboardingEmail(selected.id)).user;
      if (action === "reactivate") updated = await adminService.reactivateCustomer(selected.id);
      setUsers(previous => previous.map(user => user.id === updated.id ? updated : user));
      setSelected(updated);
      fillForm(updated);
      setMessage(`Action completed for ${updated.email}.`);
      setTimeline(await adminService.getCustomerTimeline(updated.id));
    } catch (err) {
      setError(getErrorMessage(err, "Customer action failed."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-6">
        <StatCard label="Accounts" value={stats.total} />
        <StatCard label="Trial" value={stats.trial} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Past Due" value={stats.pastDue} />
        <StatCard label="Suspended" value={stats.suspended} />
        <StatCard label="Cancelled" value={stats.cancelled} />
      </div>

      {error && <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-medium text-red-100">{error}</div>}
      {message && <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-sm font-medium text-green-100">{message}</div>}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
        <section className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-lg font-bold text-white">Customer accounts</h2>
            <form onSubmit={event => { event.preventDefault(); loadUsers(search); }} className="mt-4 flex gap-2">
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, email, plan, status or notes" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
              <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Search</button>
            </form>
          </div>

          {loading ? <div className="p-5 text-sm text-slate-400">Loading...</div> : (
            <div className="max-h-[680px] divide-y divide-slate-800 overflow-y-auto">
              {users.map(user => (
                <button key={user.id} type="button" onClick={() => selectUser(user)} className={`grid w-full min-w-0 gap-3 px-5 py-4 text-left hover:bg-slate-800 md:grid-cols-[minmax(0,1fr)_90px_90px_90px] ${selected?.id === user.id ? "bg-slate-800" : ""}`}>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{user.businessName || user.fullName || user.email}</p>
                    <p className="mt-1 truncate text-sm text-slate-400">{user.email}</p>
                  </div>
                  <Badge>{formatStatus(user.accountStatus)}</Badge>
                  <Badge>{formatStatus(user.billingStatus)}</Badge>
                  <Badge>{user.subscriptionPlan}</Badge>
                </button>
              ))}
            </div>
          )}
        </section>

        {selected ? (
          <form onSubmit={saveAccount} className="space-y-6">
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white">{selected.businessName || selected.fullName || selected.email}</h2>
                  <p className="mt-1 truncate text-sm text-slate-400">{selected.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{formatStatus(selected.accountStatus)}</Badge>
                  <Badge>{selected.subscriptionPlan}</Badge>
                  <Badge>{selected.healthStatus}</Badge>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <Mini label="User ID" value={String(selected.id)} />
                <Mini label="Tenant ID" value={String(selected.tenantId ?? selected.id)} />
                <Mini label="Created" value={formatDateTime(selected.createdAt)} />
                <Mini label="Last login" value={selected.lastLoginAt ? formatDateTime(selected.lastLoginAt) : "Never"} />
                <Mini label="Trial ends" value={selected.trialEndsAt ? formatDateTime(selected.trialEndsAt) : "None"} />
                <Mini label="Email" value={selected.isEmailVerified ? "Verified" : "Not verified"} />
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <h3 className="text-lg font-bold text-white">Account details</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Business name"><DarkInput value={businessName} onChange={setBusinessName} /></Field>
                <Field label="Owner name"><DarkInput value={ownerName} onChange={setOwnerName} /></Field>
                <Field label="Owner phone"><DarkInput value={ownerPhone} onChange={setOwnerPhone} /></Field>
                <Field label="Account source"><DarkInput value={accountSource} onChange={setAccountSource} /></Field>
                <Field label="Account status"><DarkSelect value={accountStatus} onChange={value => setAccountStatus(value as AdminAccountStatus)}>{accountStatuses.map(status => <option key={status} value={status}>{formatStatus(status)}</option>)}</DarkSelect></Field>
                <Field label="Plan"><DarkSelect value={subscriptionPlan} onChange={value => setSubscriptionPlan(value as SubscriptionPlan)}>{subscriptionPlans.map(plan => <option key={plan} value={plan}>{plan}</option>)}</DarkSelect></Field>
                <Field label="Billing status"><DarkSelect value={billingStatus} onChange={value => setBillingStatus(value as BillingStatus)}>{billingStatuses.map(status => <option key={status} value={status}>{formatStatus(status)}</option>)}</DarkSelect></Field>
                <Field label="Health"><DarkSelect value={healthStatus} onChange={value => setHealthStatus(value as HealthStatus)}><option value="Green">Green</option><option value="Amber">Amber</option><option value="Red">Red</option></DarkSelect></Field>
                <Field label="Trial end"><DarkInput value={trialEndsAt} onChange={setTrialEndsAt} type="date" /></Field>
                <Field label="Cancel reason"><DarkInput value={cancelReason} onChange={setCancelReason} /></Field>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <h3 className="text-lg font-bold text-white">Billing and notes</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Discount type"><DarkSelect value={discountType} onChange={value => setDiscountType(value as AdminDiscountType)}>{discountTypes.map(type => <option key={type} value={type}>{type}</option>)}</DarkSelect></Field>
                <Field label="Discount value"><DarkInput value={discountValue} onChange={setDiscountValue} type="number" /></Field>
                <Field label="Free months"><DarkInput value={freeMonths} onChange={setFreeMonths} type="number" /></Field>
                <Field label="Free months expiry"><DarkInput value={freeMonthsExpireAt} onChange={setFreeMonthsExpireAt} type="date" /></Field>
                <Field label="Tags"><DarkInput value={adminTags} onChange={setAdminTags} /></Field>
                <Field label="Support notes"><DarkTextarea value={supportNotes} onChange={setSupportNotes} rows={5} /></Field>
                <Field label="Admin notes"><DarkTextarea value={adminNotes} onChange={setAdminNotes} rows={5} /></Field>
                <Field label="Reason for change"><DarkTextarea value={changeReason} onChange={setChangeReason} rows={4} /></Field>
              </div>
              <button type="submit" disabled={saving} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-600">{saving ? "Saving..." : "Save customer"}</button>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <h3 className="text-lg font-bold text-white">Customer actions</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={() => runCustomerAction("verify")} disabled={saving} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Mark email verified</button>
                <button type="button" onClick={() => runCustomerAction("verification")} disabled={saving} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Send verification email</button>
                <button type="button" onClick={() => runCustomerAction("onboarding")} disabled={saving} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Send onboarding email</button>
                <button type="button" onClick={() => runCustomerAction("reactivate")} disabled={saving} className="rounded-lg border border-green-500/50 px-3 py-2 text-sm font-semibold text-green-100 hover:bg-green-500/10">Reactivate</button>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <h3 className="text-lg font-bold text-white">Account timeline</h3>
              <div className="mt-4 max-h-[320px] divide-y divide-slate-800 overflow-y-auto rounded-lg border border-slate-800">
                {timeline.length === 0 ? <p className="p-4 text-sm text-slate-400">No timeline activity yet.</p> : timeline.map(log => (
                  <div key={log.id} className="p-4">
                    <p className="text-sm font-semibold text-white">{log.summary}</p>
                    <p className="mt-1 text-xs text-slate-500">{log.action} - {formatDateTime(log.createdAt)}</p>
                  </div>
                ))}
              </div>
            </section>
          </form>
        ) : (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400 shadow-sm">
            Select a customer to open the account detail panel.
          </section>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-semibold text-white">{value}</p></div>;
}
