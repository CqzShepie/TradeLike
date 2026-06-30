import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Sidebar from "../components/layout/Sidebar";
import { businessSettingsService } from "../services/businessSettingsService";
import { staffSettingsService } from "../services/staffSettingsService";
import type { StaffCategory, StaffRolePreset, StaffSettings } from "../services/staffSettingsService";
import type { UpdateBusinessSettingsRequest } from "../types/businessSettings";

type SettingsTab =
  | "business"
  | "documents"
  | "payments"
  | "email"
  | "staff"
  | "security"
  | "billing"
  | "exports";

type StaffSettingsTab = "categories" | "roles" | "permissions";

const tabs: Array<{ id: SettingsTab; label: string; description: string }> = [
  { id: "business", label: "Business", description: "Profile, logo, contact details" },
  { id: "documents", label: "Documents", description: "VAT, quote and invoice defaults" },
  { id: "payments", label: "Payments", description: "Bank details and payment terms" },
  { id: "email", label: "Email", description: "Email footer and templates" },
  { id: "staff", label: "Staff", description: "Categories, roles and permissions" },
  { id: "security", label: "Security", description: "Login and account safety" },
  { id: "billing", label: "Billing", description: "Plans and subscription defaults" },
  { id: "exports", label: "Exports", description: "Reports and data downloads" },
];

const staffSettingsTabs: Array<{ id: StaffSettingsTab; label: string; description: string }> = [
  { id: "categories", label: "Categories", description: "Trade business staff groups" },
  { id: "roles", label: "Role presets", description: "Default permission templates" },
  { id: "permissions", label: "Permission groups", description: "What each area controls" },
];

const permissionDescriptions: Record<string, string> = {
  "Full access": "Allows the role to use every staff setting, role preset, customer record, job, quote, invoice, payment, report, and business setting.",
  "Customer records": "View and update customer contact details, customer account information, and customer history.",
  "Customer notes": "View and add notes for customer support, job follow-ups, engineer handovers, and internal updates.",
  "Jobs and scheduling": "Manage jobs, appointments, calendars, engineer allocation, site visits, and daily work schedules.",
  "Quotes and invoices": "Create, edit, send, and manage customer quotes, invoices, and related document details.",
  "Payments": "View and manage payment details, payment terms, paid/unpaid status, and finance-related customer information.",
  "Offers and promotions": "Manage customer offers, trade promotions, seasonal discounts, and marketing incentives.",
  "Staff password resets": "Reset staff login access when a team member is locked out or needs help signing in.",
  "Email customers": "Send customer emails, updates, reminders, confirmations, and template-based messages.",
  "Staff management": "Create, edit, suspend, or remove staff accounts and maintain team details.",
  "Staff invites": "Invite new staff members and resend pending staff invitations.",
  "Business settings": "Manage business profile, document defaults, email footer, payment details, and operational settings.",
  "Activity log": "View important staff and account activity for accountability, admin checks, and troubleshooting.",
  "Reports and exports": "Export customer, job, payment, quote, invoice, and activity data for business records.",
};

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

const blankStaffSettings: StaffSettings = {
  categories: [],
  rolePresets: [],
  permissionGroups: [],
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("business");
  const [activeStaffSettingsTab, setActiveStaffSettingsTab] = useState<StaffSettingsTab>("categories");
  const [form, setForm] = useState<UpdateBusinessSettingsRequest>(blankSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [staffSettings, setStaffSettings] = useState<StaffSettings>(blankStaffSettings);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffMessage, setStaffMessage] = useState("");

  useEffect(() => {
    loadSettings();
    loadStaffSettings();
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

  async function loadStaffSettings() {
    try {
      setStaffLoading(true);
      setStaffError("");
      setStaffSettings(await staffSettingsService.getSettings());
    } catch (err) {
      setStaffError(getErrorMessage(err, "Unable to load staff settings."));
    } finally {
      setStaffLoading(false);
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
      setMessage("Settings saved.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save settings."));
    } finally {
      setSaving(false);
    }
  }

  async function createStaffCategory(name: string, description: string) {
    try {
      setStaffSaving(true);
      setStaffError("");
      setStaffMessage("");
      setStaffSettings(await staffSettingsService.createCategory({ name, description }));
      setStaffMessage("Staff category saved.");
    } catch (err) {
      setStaffError(getErrorMessage(err, "Unable to save staff category."));
      throw err;
    } finally {
      setStaffSaving(false);
    }
  }

  async function deleteStaffCategory(category: StaffCategory) {
    if (!window.confirm(`Delete ${category.name}? This will also remove any role presets in this category.`)) return;

    try {
      setStaffSaving(true);
      setStaffError("");
      setStaffMessage("");
      setStaffSettings(await staffSettingsService.deleteCategory(category.id));
      setStaffMessage("Staff category deleted.");
    } catch (err) {
      setStaffError(getErrorMessage(err, "Unable to delete staff category."));
    } finally {
      setStaffSaving(false);
    }
  }

  async function createStaffRolePreset(name: string, categoryId: number, permissions: string[]) {
    try {
      setStaffSaving(true);
      setStaffError("");
      setStaffMessage("");
      setStaffSettings(await staffSettingsService.createRolePreset({ name, categoryId, permissions }));
      setStaffMessage("Role preset saved.");
    } catch (err) {
      setStaffError(getErrorMessage(err, "Unable to save role preset."));
      throw err;
    } finally {
      setStaffSaving(false);
    }
  }

  async function deleteStaffRolePreset(rolePreset: StaffRolePreset) {
    if (!window.confirm(`Delete the ${rolePreset.name} role preset?`)) return;

    try {
      setStaffSaving(true);
      setStaffError("");
      setStaffMessage("");
      setStaffSettings(await staffSettingsService.deleteRolePreset(rolePreset.id));
      setStaffMessage("Role preset deleted.");
    } catch (err) {
      setStaffError(getErrorMessage(err, "Unable to delete role preset."));
    } finally {
      setStaffSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <section className="min-w-0 flex-1 overflow-x-hidden p-10">
        <div className="w-full max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Settings
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            TradeLike Settings
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Manage business details, document defaults, staff settings, security,
            billing, and exports from one place.
          </p>

          <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-lg px-4 py-3 text-left transition ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="block text-sm font-semibold">{tab.label}</span>
                  <span className={`mt-1 block text-xs ${activeTab === tab.id ? "text-blue-100" : "text-slate-500"}`}>
                    {tab.description}
                  </span>
                </button>
              ))}
            </aside>

            <div className="min-w-0">
              {loading && activeTab !== "staff" ? (
                <p className="text-slate-500">Loading settings...</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && activeTab !== "staff" && (
                    <div className="max-h-40 overflow-y-auto break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                      {error}
                    </div>
                  )}
                  {message && activeTab !== "staff" && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                      {message}
                    </div>
                  )}

                  {activeTab === "business" && (
                    <>
                      <SettingsPanel title="Business profile">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Business name"><Input value={form.businessName} onChange={value => setField("businessName", value)} /></Field>
                          <Field label="Legal name"><Input value={form.legalName ?? ""} onChange={value => setField("legalName", value)} /></Field>
                          <Field label="Logo URL"><Input value={form.logoUrl ?? ""} onChange={value => setField("logoUrl", value)} /></Field>
                          <Field label="VAT number"><Input value={form.vatNumber ?? ""} onChange={value => setField("vatNumber", value)} /></Field>
                        </div>
                      </SettingsPanel>

                      <SettingsPanel title="Contact and address">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Email"><Input value={form.email ?? ""} onChange={value => setField("email", value)} /></Field>
                          <Field label="Phone"><Input value={form.phone ?? ""} onChange={value => setField("phone", value)} /></Field>
                          <Field label="Website"><Input value={form.website ?? ""} onChange={value => setField("website", value)} /></Field>
                          <Field label="Country"><Input value={form.country ?? ""} onChange={value => setField("country", value)} /></Field>
                          <Field label="Address line 1"><Input value={form.addressLine1 ?? ""} onChange={value => setField("addressLine1", value)} /></Field>
                          <Field label="Address line 2"><Input value={form.addressLine2 ?? ""} onChange={value => setField("addressLine2", value)} /></Field>
                          <Field label="Town / city"><Input value={form.town ?? ""} onChange={value => setField("town", value)} /></Field>
                          <Field label="County"><Input value={form.county ?? ""} onChange={value => setField("county", value)} /></Field>
                          <Field label="Postcode"><Input value={form.postcode ?? ""} onChange={value => setField("postcode", value)} /></Field>
                        </div>
                      </SettingsPanel>
                    </>
                  )}

                  {activeTab === "documents" && (
                    <SettingsPanel title="Documents and VAT">
                      <div className="grid gap-4 md:grid-cols-3">
                        <Field label="Default VAT rate (%)"><Input value={String(form.defaultVatRate)} type="number" min="0" max="100" step="0.01" onChange={value => setField("defaultVatRate", Number(value || 0))} /></Field>
                        <Field label="Quote prefix"><Input value={form.quotePrefix} onChange={value => setField("quotePrefix", value)} /></Field>
                        <Field label="Invoice prefix"><Input value={form.invoicePrefix} onChange={value => setField("invoicePrefix", value)} /></Field>
                      </div>
                      <div className="mt-4">
                        <Field label="Payment terms"><Textarea value={form.paymentTerms ?? ""} onChange={value => setField("paymentTerms", value)} rows={4} /></Field>
                      </div>
                    </SettingsPanel>
                  )}

                  {activeTab === "payments" && (
                    <SettingsPanel title="Payment details">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Bank name"><Input value={form.bankName ?? ""} onChange={value => setField("bankName", value)} /></Field>
                        <Field label="Account name"><Input value={form.bankAccountName ?? ""} onChange={value => setField("bankAccountName", value)} /></Field>
                        <Field label="Sort code"><Input value={form.bankSortCode ?? ""} onChange={value => setField("bankSortCode", value)} /></Field>
                        <Field label="Account number"><Input value={form.bankAccountNumber ?? ""} onChange={value => setField("bankAccountNumber", value)} /></Field>
                      </div>
                    </SettingsPanel>
                  )}

                  {activeTab === "email" && (
                    <SettingsPanel title="Email settings">
                      <Field label="Email footer"><Textarea value={form.emailFooter ?? ""} onChange={value => setField("emailFooter", value)} rows={6} /></Field>
                    </SettingsPanel>
                  )}

                  {activeTab === "staff" && (
                    <StaffSettingsPanel
                      activeTab={activeStaffSettingsTab}
                      setActiveTab={setActiveStaffSettingsTab}
                      settings={staffSettings}
                      loading={staffLoading}
                      saving={staffSaving}
                      error={staffError}
                      message={staffMessage}
                      onCreateCategory={createStaffCategory}
                      onDeleteCategory={deleteStaffCategory}
                      onCreateRolePreset={createStaffRolePreset}
                      onDeleteRolePreset={deleteStaffRolePreset}
                    />
                  )}
                  {activeTab === "security" && <ComingSoon title="Security settings" items={["Login attempt rules", "Session expiry", "Password policy", "Security log retention"]} />}
                  {activeTab === "billing" && <ComingSoon title="Billing settings" items={["Plan defaults", "Trial length", "Free month rules", "Past-due recovery settings"]} />}
                  {activeTab === "exports" && <ComingSoon title="Export settings" items={["Customer exports", "Audit log exports", "Billing reports", "Trial expiry reports"]} />}

                  {["business", "documents", "payments", "email"].includes(activeTab) && (
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {saving ? "Saving..." : "Save Settings"}
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );

  function setField<Key extends keyof UpdateBusinessSettingsRequest>(
    key: Key,
    value: UpdateBusinessSettingsRequest[Key]
  ) {
    setForm(previous => ({ ...previous, [key]: value }));
    setError("");
    setMessage("");
  }
}

function SettingsPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StaffSettingsPanel({
  activeTab,
  setActiveTab,
  settings,
  loading,
  saving,
  error,
  message,
  onCreateCategory,
  onDeleteCategory,
  onCreateRolePreset,
  onDeleteRolePreset,
}: {
  activeTab: StaffSettingsTab;
  setActiveTab: (tab: StaffSettingsTab) => void;
  settings: StaffSettings;
  loading: boolean;
  saving: boolean;
  error: string;
  message: string;
  onCreateCategory: (name: string, description: string) => Promise<void>;
  onDeleteCategory: (category: StaffCategory) => Promise<void>;
  onCreateRolePreset: (name: string, categoryId: number, permissions: string[]) => Promise<void>;
  onDeleteRolePreset: (rolePreset: StaffRolePreset) => Promise<void>;
}) {
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleCategoryId, setRoleCategoryId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  async function addCategory() {
    if (categoryName.trim() === "") return;

    try {
      await onCreateCategory(categoryName, categoryDescription);
      setCategoryName("");
      setCategoryDescription("");
    } catch {
      // Parent displays the error.
    }
  }

  function togglePermission(permission: string) {
    setSelectedPermissions(previous =>
      previous.includes(permission)
        ? previous.filter(item => item !== permission)
        : [...previous, permission]
    );
  }

  async function addRolePreset() {
    const categoryId = Number(roleCategoryId || settings.categories[0]?.id || 0);
    if (roleName.trim() === "" || categoryId === 0 || selectedPermissions.length === 0) return;

    try {
      await onCreateRolePreset(roleName, categoryId, selectedPermissions);
      setRoleName("");
      setSelectedPermissions([]);
    } catch {
      // Parent displays the error.
    }
  }

  return (
    <SettingsPanel title="Staff settings">
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        Set up trade-business staff categories and role permission presets. These are saved to the database and can be reused later when inviting or editing staff.
      </div>

      {error && (
        <div className="mt-4 max-h-40 overflow-y-auto break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
          {message}
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {staffSettingsTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg border p-4 text-left transition ${
              activeTab === tab.id
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="block text-sm font-bold">{tab.label}</span>
            <span className={`mt-1 block text-xs ${activeTab === tab.id ? "text-blue-100" : "text-slate-500"}`}>
              {tab.description}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading staff settings...</p>
      ) : (
        <>
          {activeTab === "categories" && (
            <div className="mt-6 space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                {settings.categories.map(category => (
                  <div key={category.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{category.name}</p>
                        <p className="mt-1 text-sm text-slate-600">{category.description}</p>
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onDeleteCategory(category)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">Create staff category</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Category name"><Input value={categoryName} onChange={setCategoryName} /></Field>
                  <Field label="Description"><Input value={categoryDescription} onChange={setCategoryDescription} /></Field>
                </div>
                <button type="button" disabled={saving} onClick={addCategory} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                  {saving ? "Saving..." : "Add category"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "roles" && (
            <div className="mt-6 space-y-5">
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">Create role preset</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Role name"><Input value={roleName} onChange={setRoleName} /></Field>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Staff category</span>
                    <select value={roleCategoryId || String(settings.categories[0]?.id ?? "")} onChange={event => setRoleCategoryId(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600">
                      {settings.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </label>
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-slate-700">Default permissions</p>
                  <div className="flex flex-wrap gap-2">
                    {settings.permissionGroups.map(permission => (
                      <button
                        key={permission}
                        type="button"
                        onClick={() => togglePermission(permission)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          selectedPermissions.includes(permission)
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {permission}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="button" disabled={saving || settings.categories.length === 0} onClick={addRolePreset} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                  {saving ? "Saving..." : "Add role preset"}
                </button>
              </div>

              <div className="grid gap-3">
                {settings.rolePresets.map(role => (
                  <div key={role.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{role.name}</p>
                        <p className="text-sm text-slate-600">{role.categoryName}</p>
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onDeleteRolePreset(role)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {role.permissions.map(permission => (
                        <span key={permission} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {settings.permissionGroups.map(permission => (
                <div key={permission} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{permission}</p>
                  <p className="mt-1 text-sm text-slate-600">{permissionDescriptions[permission] ?? "Custom permission group for role presets."}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </SettingsPanel>
  );
}

function ComingSoon({ title, items }: { title: string; items: string[] }) {
  return (
    <SettingsPanel title={title}>
      <p className="text-sm text-slate-600">This settings area is ready for the next build pass.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map(item => (
          <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </SettingsPanel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange, type = "text", min, max, step }: { value: string; onChange: (value: string) => void; type?: string; min?: string; max?: string; step?: string }) {
  return <input value={value} type={type} min={min} max={max} step={step} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600" />;
}

function Textarea({ value, onChange, rows }: { value: string; onChange: (value: string) => void; rows: number }) {
  return <textarea value={value} rows={rows} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600" />;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== "" ? error.message : fallback;
}
