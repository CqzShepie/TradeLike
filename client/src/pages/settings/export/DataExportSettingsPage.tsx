import { useState } from "react";

import { getToken } from "../../../services/apiClient";

const apiBase = (import.meta.env.VITE_API_URL ?? "http://localhost:5001/api").replace(/\/$/, "");

export default function DataExportSettingsPage() {
  const [downloadUrl, setDownloadUrl] = useState("");
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    setMessage("");
    setDownloadUrl("");
    try {
      const response = await fetch(`${apiBase}/export/full?format=csv`, {
        headers: {
          Authorization: `Bearer ${getToken() ?? ""}`,
        },
      });

      if (response.status === 402) {
        setMessage("Full export is available on Business and Enterprise plans.");
        return;
      }

      if (response.status === 429) {
        const body = await response.json() as { retryAfterUtc?: string };
        setMessage(body.retryAfterUtc ? `Export cooldown active until ${new Date(body.retryAfterUtc).toLocaleString("en-GB")}.` : "Export cooldown active.");
        return;
      }

      if (!response.ok) {
        setMessage("Export could not be created.");
        return;
      }

      const blob = await response.blob();
      setDownloadUrl(URL.createObjectURL(blob));
      setMessage("Export ready.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Settings</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Data and export</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Download a ZIP containing customers, jobs, quotes, invoices, and stock CSV files.
        </p>
        <button
          type="button"
          onClick={() => void exportData()}
          disabled={exporting}
          title="Business plans can export once per day. Enterprise has a 15 minute cooldown."
          className="mt-6 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600 disabled:bg-slate-300"
        >
          {exporting ? "Preparing export" : "Full export"}
        </button>
        {message && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">{message}</p>}
        {downloadUrl && (
          <a href={downloadUrl} download="tradelike-full-export.zip" className="mt-4 inline-flex rounded-lg border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50">
            Download ZIP
          </a>
        )}
      </section>
    </main>
  );
}
