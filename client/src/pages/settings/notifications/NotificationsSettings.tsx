import Sidebar from "../../../components/layout/Sidebar";
import { usePushNotifications } from "../../../hooks/usePushNotifications";

export default function NotificationsSettings() {
  const push = usePushNotifications();

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <section className="min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Settings</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Notifications</h1>
          <p className="mt-2 text-sm text-slate-600">Enable job and quote notifications for this device.</p>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-950">Push notifications</h2>
                <p className="text-sm text-slate-600">Job assigned and quote accepted alerts.</p>
                <p className="mt-1 text-xs font-semibold text-blue-700">Status: {push.state}</p>
              </div>
              <button
                type="button"
                onClick={() => void push.enable()}
                disabled={!push.supported || push.state === "enabled"}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400"
              >
                {push.state === "enabled" ? "Enabled" : "Enable"}
              </button>
            </div>
            {push.error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{push.error}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
