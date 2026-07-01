import { useState } from "react";
import type { FormEvent } from "react";
import { Download, RefreshCw, Upload } from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import { Button, InlineAlert, PageHeader, PageShell, PanelCard, SelectInput, TextArea } from "../../components/ui";
import { getToken } from "../../services/apiClient";

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:5001/api").replace(/\/$/, "");

type ImportEntity = "customers" | "jobs" | "invoices";

type ImportJobCreated = {
  jobId: number;
  entity: string;
  status: string;
  totalRows: number;
};

type ImportJobStatus = ImportJobCreated & {
  fileName: string;
  succeededRows: number;
  failedRows: number;
  errorSummary: string;
  createdAtUtc: string;
  completedAtUtc: string | null;
  errors: Array<{
    rowNumber: number;
    fieldName: string;
    message: string;
    rawRow: string;
  }>;
};

export default function ImportExportPage() {
  const [entity, setEntity] = useState<ImportEntity>("customers");
  const [file, setFile] = useState<File | null>(null);
  const [pastedData, setPastedData] = useState("");
  const [job, setJob] = useState<ImportJobStatus | ImportJobCreated | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function submitImport(event: FormEvent) {
    event.preventDefault();
    setImporting(true);
    setError("");
    setMessage("");

    try {
      const body = file ? buildFormData(file) : pastedData;
      const headers = new Headers();
      const token = getToken();

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      if (!file) {
        headers.set("Content-Type", pastedData.trimStart().startsWith("[") ? "application/json" : "text/csv");
      }

      const response = await fetch(`${API_BASE_URL}/import/${entity}`, {
        method: "POST",
        headers,
        body,
      });

      const created = await readResponse<ImportJobCreated>(response);
      setJob(created);
      setMessage(`Import job ${created.jobId} queued.`);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to start import."));
    } finally {
      setImporting(false);
    }
  }

  async function refreshJob() {
    if (!job) return;
    setError("");

    try {
      const response = await authorizedFetch(`${API_BASE_URL}/import/jobs/${job.jobId}`);
      setJob(await readResponse<ImportJobStatus>(response));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to refresh import job."));
    }
  }

  async function exportData() {
    setExporting(true);
    setError("");

    try {
      const response = await authorizedFetch(`${API_BASE_URL}/export/all-data.zip`);
      if (!response.ok) {
        await readResponse<never>(response);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tradelike-all-data-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
      setMessage("Export downloaded.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to export data."));
    } finally {
      setExporting(false);
    }
  }

  const status = "status" in (job ?? {}) ? job?.status : null;

  return (
    <PageShell sidebar={<Sidebar />}>
      <PageHeader
        eyebrow="Data"
        title="Import & Export"
        description="Bring operational records into TradeLike and download a tenant data archive."
        actions={
          <Button onClick={exportData} loading={exporting}>
            <Download className="mr-2 h-4 w-4" />
            Export zip
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <PanelCard title="Import records">
          <form className="space-y-5" onSubmit={submitImport}>
            {error && <InlineAlert tone="error">{error}</InlineAlert>}
            {message && <InlineAlert tone="success">{message}</InlineAlert>}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Entity</span>
              <SelectInput value={entity} onChange={event => setEntity(event.target.value as ImportEntity)}>
                <option value="customers">Customers</option>
                <option value="jobs">Jobs</option>
                <option value="invoices">Invoices</option>
              </SelectInput>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">CSV file</span>
              <input
                type="file"
                accept=".csv,application/json,text/csv"
                onChange={event => setFile(event.target.files?.[0] ?? null)}
                className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Pasted CSV or JSON</span>
              <TextArea
                value={pastedData}
                onChange={event => setPastedData(event.target.value)}
                rows={9}
                placeholder="name,email,phone,address"
                disabled={file !== null}
              />
            </label>

            <Button type="submit" loading={importing} disabled={!file && pastedData.trim().length === 0}>
              <Upload className="mr-2 h-4 w-4" />
              Start import
            </Button>
          </form>
        </PanelCard>

        <PanelCard
          title="Latest job"
          action={
            <Button variant="secondary" size="sm" onClick={refreshJob} disabled={!job}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          }
        >
          {job ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">Job #{job.jobId}</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{status}</p>
                <p className="mt-1 text-sm text-slate-600">{job.entity} · {job.totalRows} rows</p>
              </div>

              {"succeededRows" in job && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Succeeded" value={job.succeededRows} tone="text-emerald-700" />
                  <Metric label="Failed" value={job.failedRows} tone="text-red-700" />
                </div>
              )}

              {"errors" in job && job.errors.length > 0 && (
                <div className="max-h-80 space-y-3 overflow-auto pr-1">
                  {job.errors.map(errorRow => (
                    <div key={`${errorRow.rowNumber}-${errorRow.message}`} className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">
                      <p className="font-semibold">Row {errorRow.rowNumber}</p>
                      <p className="mt-1">{errorRow.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-600">No import job selected.</p>
          )}
        </PanelCard>
      </div>
    </PageShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function buildFormData(file: File) {
  const data = new FormData();
  data.append("file", file);
  return data;
}

async function authorizedFetch(url: string) {
  const headers = new Headers();
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { headers });
}

async function readResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(parseError(text, response.status));
  }

  return text ? JSON.parse(text) as T : undefined as T;
}

function parseError(text: string, status: number) {
  if (!text.trim()) {
    return `Request failed (${status})`;
  }

  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    return parsed.error ?? parsed.message ?? text;
  } catch {
    return text;
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== "" ? error.message : fallback;
}
