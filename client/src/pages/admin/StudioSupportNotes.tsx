import { useMemo, useState } from "react";
import { adminService } from "../../services/adminService";
import type { AdminUser, HealthStatus } from "../../types/admin";
import { Badge, DarkTextarea } from "./adminPortalComponents";
import { formatDateTime, getErrorMessage } from "./adminPortalHelpers";
import { customerAccounts, customerDisplayName, hasSupportNotes, healthLabel } from "./studioData";

type HealthFilter = "all" | HealthStatus;

export default function StudioSupportNotes({
  users,
  onOpenCustomer,
  onCustomerUpdated,
}: {
  users: AdminUser[];
  onOpenCustomer: (user: AdminUser) => void;
  onCustomerUpdated: (user: AdminUser) => void;
}) {
  const [search, setSearch] = useState("");
  const [health, setHealth] = useState<HealthFilter>("all");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const notes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customerAccounts(users)
      .filter(hasSupportNotes)
      .filter(user => health === "all" || user.healthStatus === health)
      .filter(user => query === "" || [
        customerDisplayName(user),
        user.ownerName ?? "",
        user.email,
        user.supportNotes ?? "",
        user.adminTags ?? "",
      ].some(value => value.toLowerCase().includes(query)))
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());
  }, [health, search, users]);

  async function addNote(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || note.trim() === "") {
      setError("Choose a customer and enter a support note.");
      setMessage("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const updated = await adminService.addCustomerSupportNote(selected.id, { note });
      onCustomerUpdated(updated);
      setSelected(updated);
      setNote("");
      setMessage(`Support note added for ${updated.email}.`);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to add support note."));
      setMessage("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Support notes</h2>
            <p className="mt-1 text-sm text-slate-400">Recent customer notes with health and account context.</p>
          </div>
          <Badge>{notes.length} notes</Badge>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search customer notes" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
          <select value={health} onChange={event => setHealth(event.target.value as HealthFilter)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
            <option value="all">All health</option>
            <option value="Green">Healthy</option>
            <option value="Amber">Watch</option>
            <option value="Red">At risk</option>
          </select>
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-medium text-red-100">{error}</div>}
      {message && <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-sm font-medium text-green-100">{message}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
          <div className="border-b border-slate-800 px-5 py-4">
            <h3 className="text-lg font-bold text-white">Recent notes</h3>
          </div>
          <div className="max-h-[720px] divide-y divide-slate-800 overflow-y-auto">
            {notes.length === 0 ? <p className="p-5 text-sm text-slate-400">No support notes found.</p> : notes.map(user => (
              <article key={user.id} className="p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{customerDisplayName(user)}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{healthLabel(user.healthStatus)}</Badge>
                    <Badge>{user.subscriptionPlan}</Badge>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-300">{user.supportNotes}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>Updated {user.updatedAt ? formatDateTime(user.updatedAt) : "unknown"}</span>
                  <button type="button" onClick={() => setSelected(user)} className="font-semibold text-blue-300 hover:text-blue-200">Add note</button>
                  <button type="button" onClick={() => onOpenCustomer(user)} className="font-semibold text-blue-300 hover:text-blue-200">Open customer</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <form onSubmit={addNote} className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-white">Add support note</h3>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-300">Customer</span>
            <select value={selected?.id ?? ""} onChange={event => setSelected(users.find(user => user.id === Number(event.target.value)) ?? null)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
              <option value="">Choose customer</option>
              {customerAccounts(users).map(user => <option key={user.id} value={user.id}>{customerDisplayName(user)}</option>)}
            </select>
          </label>
          <DarkTextarea value={note} onChange={setNote} placeholder="Add a clear support note" rows={6} className="mt-4" />
          <button type="submit" disabled={saving} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600">
            {saving ? "Adding..." : "Add note"}
          </button>
        </form>
      </div>
    </div>
  );
}

