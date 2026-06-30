import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Sidebar from "../components/layout/Sidebar";
import { businessSettingsService } from "../services/businessSettingsService";
import type { UpdateBusinessSettingsRequest } from "../types/businessSettings";

const blankSettings: UpdateBusinessSettingsRequest = {
  businessName: "TradeLike",
  legalName: "",
  logoUrl: "",
  addressLine1: "",
  addressLine2: "",
  town: "",
  county: "",
  postcode: "",
  country: "United Kingdom",
  phone: "",
  email: "",
  website: "",
  vatNumber: "",
  defaultVatRate: 20,
  quotePrefix: "Q",
  invoicePrefix: "INV",
  paymentTerms: "Payment due within 14 days.",
  bankName: "",
  bankAccountName: "",
  bankSortCode: "",
  bankAccountNumber: "",
  emailFooter: "Thank you for choosing TradeLike.",
};

export default function Settings() {
  const [form, setForm] = useState<UpdateBusinessSettingsRequest>(blankSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const settings = await businessSettingsService.getSettings();

      setForm({
        businessName: settings.businessName,
        legalName: settings.legalName ?? "",
        logoUrl: settings.logoUrl ?? "",
        addressLine1: settings.addressLine1 ?? "",
        addressLine2: settings.addressLine2 ?? "",
        town: settings.town ?? "",
        county: settings.county ?? "",
        postcode: settings.postcode ?? "",
        country: settings.country ?? "United Kingdom",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        website: settings.website ?? "",
        vatNumber: settings.vatNumber ?? "",
        defaultVatRate: settings.defaultVatRate,
        quotePrefix: settings.quotePrefix,
        invoicePrefix: settings.invoicePrefix,
        paymentTerms: settings.paymentTerms ?? "",
        bankName: settings.bankName ?? "",
        bankAccountName: settings.bankAccountName ?? "",
        bankSortCode: settings.bankSortCode ?? "",
        bankAccountNumber: settings.bankAccountNumber ?? "",
        emailFooter: settings.emailFooter ?? "",
      });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load business settings."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (form.businessName.trim() === "") {
      setError("Business name is required.");
      setMessage("");
      return;
    }

    if (form.quotePrefix.trim() === "") {
      setError("Quote prefix is required.");
      setMessage("");
      return;
    }

    if (form.invoicePrefix.trim() === "") {
      setError("Invoice prefix is required.");
      setMessage("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const saved = await businessSettingsService.updateSettings(form);

      setForm({
        businessName: saved.businessName,
        legalName: saved.legalName ?? "",
        logoUrl: saved.logoUrl ?? "",
        addressLine1: saved.addressLine1 ?? "",
        addressLine2: saved.addressLine2 ?? "",
        town: saved.town ?? "",
        county: saved.county ?? "",
        postcode: saved.postcode ?? "",
        country: saved.country ?? "United Kingdom",
        phone: saved.phone ?? "",
        email: saved.email ?? "",
        website: saved.website ?? "",
        vatNumber: saved.vatNumber ?? "",
        defaultVatRate: saved.defaultVatRate,
        quotePrefix: saved.quotePrefix,
        invoicePrefix: saved.invoicePrefix,
        paymentTerms: saved.paymentTerms ?? "",
        bankName: saved.bankName ?? "",
        bankAccountName: saved.bankAccountName ?? "",
        bankSortCode: saved.bankSortCode ?? "",
        bankAccountNumber: saved.bankAccountNumber ?? "",
        emailFooter: saved.emailFooter ?? "",
      });

      setMessage("Business settings saved.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save business settings."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <section className="flex-1 p-10">
        <div className="max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Settings
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Business Settings
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            These details will be used on quotes, invoices, emails, document
            numbers, payment instructions, and PDF templates.
          </p>

          {loading ? (
            <p className="mt-8 text-slate-500">Loading settings...</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                  {message}
                </div>
              )}

              <SettingsPanel title="Business profile">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Business name">
                    <Input value={form.businessName} onChange={value => setField("businessName", value)} />
                  </Field>
                  <Field label="Legal name">
                    <Input value={form.legalName ?? ""} onChange={value => setField("legalName", value)} />
                  </Field>
                  <Field label="Logo URL">
                    <Input value={form.logoUrl ?? ""} onChange={value => setField("logoUrl", value)} />
                  </Field>
                  <Field label="VAT number">
                    <Input value={form.vatNumber ?? ""} onChange={value => setField("vatNumber", value)} />
                  </Field>
                </div>
              </SettingsPanel>

              <SettingsPanel title="Contact and address">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Email">
                    <Input value={form.email ?? ""} onChange={value => setField("email", value)} />
                  </Field>
                  <Field label="Phone">
                    <Input value={form.phone ?? ""} onChange={value => setField("phone", value)} />
                  </Field>
                  <Field label="Website">
                    <Input value={form.website ?? ""} onChange={value => setField("website", value)} />
                  </Field>
                  <Field label="Country">
                    <Input value={form.country ?? ""} onChange={value => setField("country", value)} />
                  </Field>
                  <Field label="Address line 1">
                    <Input value={form.addressLine1 ?? ""} onChange={value => setField("addressLine1", value)} />
                  </Field>
                  <Field label="Address line 2">
                    <Input value={form.addressLine2 ?? ""} onChange={value => setField("addressLine2", value)} />
                  </Field>
                  <Field label="Town / city">
                    <Input value={form.town ?? ""} onChange={value => setField("town", value)} />
                  </Field>
                  <Field label="County">
                    <Input value={form.county ?? ""} onChange={value => setField("county", value)} />
                  </Field>
                  <Field label="Postcode">
                    <Input value={form.postcode ?? ""} onChange={value => setField("postcode", value)} />
                  </Field>
                </div>
              </SettingsPanel>

              <SettingsPanel title="Documents and tax">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Default VAT rate (%)">
                    <Input
                      value={String(form.defaultVatRate)}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      onChange={value => setField("defaultVatRate", Number(value || 0))}
                    />
                  </Field>
                  <Field label="Quote prefix">
                    <Input value={form.quotePrefix} onChange={value => setField("quotePrefix", value)} />
                  </Field>
                  <Field label="Invoice prefix">
                    <Input value={form.invoicePrefix} onChange={value => setField("invoicePrefix", value)} />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Payment terms">
                    <Textarea value={form.paymentTerms ?? ""} onChange={value => setField("paymentTerms", value)} rows={4} />
                  </Field>
                </div>
              </SettingsPanel>

              <SettingsPanel title="Payment details">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Bank name">
                    <Input value={form.bankName ?? ""} onChange={value => setField("bankName", value)} />
                  </Field>
                  <Field label="Account name">
                    <Input value={form.bankAccountName ?? ""} onChange={value => setField("bankAccountName", value)} />
                  </Field>
                  <Field label="Sort code">
                    <Input value={form.bankSortCode ?? ""} onChange={value => setField("bankSortCode", value)} />
                  </Field>
                  <Field label="Account number">
                    <Input value={form.bankAccountNumber ?? ""} onChange={value => setField("bankAccountNumber", value)} />
                  </Field>
                </div>
              </SettingsPanel>

              <SettingsPanel title="Email footer">
                <Textarea value={form.emailFooter ?? ""} onChange={value => setField("emailFooter", value)} rows={5} />
              </SettingsPanel>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );

  function setField<Key extends keyof UpdateBusinessSettingsRequest>(
    key: Key,
    value: UpdateBusinessSettingsRequest[Key]
  ) {
    setForm(previous => ({
      ...previous,
      [key]: value,
    }));
    setError("");
    setMessage("");
  }
}

function SettingsPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  min,
  max,
  step,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <input
      value={value}
      type={type}
      min={min}
      max={max}
      step={step}
      onChange={event => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
    />
  );
}

function Textarea({
  value,
  onChange,
  rows,
}: {
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={event => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
    />
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== ""
    ? error.message
    : fallback;
}
