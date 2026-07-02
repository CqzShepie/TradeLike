import type { AuthUser } from "../../services/authService";
import { Badge } from "./adminPortalComponents";
import { permissionDefinitions } from "./adminPortalConstants";

export default function StudioSettings({ currentUser }: { currentUser: AuthUser | null }) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-white">Studio settings</h2>
        <p className="mt-1 text-sm text-slate-400">Internal portal preferences and access summary. Provider setup is intentionally managed outside this branch.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-white">Signed-in staff member</h3>
          <div className="mt-4 space-y-3">
            <Info label="Name" value={currentUser?.name ?? "Unknown"} />
            <Info label="Email" value={currentUser?.email ?? "Unknown"} />
            <Info label="Role" value={currentUser?.role ?? "Unknown"} />
            <Info label="Status" value={currentUser?.accountStatus ?? "Unknown"} />
            <Info label="PA to" value={currentUser?.personalAssistantTo ?? "Not set"} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-white">Email actions</h3>
          <p className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">
            Studio can show invite, onboarding, verification and reset actions only through existing backend endpoints. Email provider configuration is handled separately.
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <h3 className="text-lg font-bold text-white">Your permissions</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {permissionDefinitions.map(permission => (
            <div key={permission.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div>
                <p className="text-sm font-semibold text-white">{permission.label}</p>
                <p className="mt-1 text-xs text-slate-500">{permission.group}</p>
              </div>
              <Badge>{currentUser?.[permission.key] ? "Allowed" : "Hidden"}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="truncate font-semibold text-white">{value}</span>
    </div>
  );
}

