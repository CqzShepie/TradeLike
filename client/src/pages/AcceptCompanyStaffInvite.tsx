import { useEffect, useState } from "react";
import { apiClient } from "../services/apiClient";

type InvitePreview = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  status: string;
  inviteSentAt?: string | null;
  inviteExpiresAt?: string | null;
  inviteAcceptedAt?: string | null;
};

export default function AcceptCompanyStaffInvite() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const result = await apiClient.get(
          `/customer-staff-invites/preview?token=${encodeURIComponent(token)}`
        ) as InvitePreview;
        setPreview(result);
      } catch {
        setError("This invite link could not be found or has expired.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  async function acceptInvite() {
    try {
      setSaving(true);
      setError("");
      const result = await apiClient.post("/customer-staff-invites/accept", { token }) as InvitePreview;
      setPreview(result);
      setMessage("Invite accepted. Company staff login is pending and will be enabled in a later update.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to accept invite.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-white p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">TradeLike staff invite</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Accept company staff invite</h1>

        {loading && <p className="mt-6 text-sm text-slate-500">Loading invite...</p>}
        {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        {message && <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">{message}</div>}

        {preview && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-bold text-slate-900">{preview.firstName} {preview.lastName}</p>
              <p>{preview.email}</p>
              <p className="mt-1 text-blue-700">{preview.roleName} - {preview.status}</p>
              {preview.inviteExpiresAt && (
                <p className="mt-2 text-xs text-slate-500">
                  Expires {new Date(preview.inviteExpiresAt).toLocaleString("en-GB")}
                </p>
              )}
            </div>

            {preview.status === "Active" ? (
              <p className="text-sm text-slate-600">
                This invite has been accepted. Company staff login is pending and will be enabled in a later update.
              </p>
            ) : (
              <>
                <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                  Accepting this invite activates your company staff profile. Password login for company staff is not enabled yet.
                </p>
                <button
                  type="button"
                  disabled={saving}
                  onClick={acceptInvite}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {saving ? "Accepting..." : "Accept invite"}
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
