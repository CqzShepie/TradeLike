import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Sidebar from "../components/layout/Sidebar";
import { businessSettingsService } from "../services/businessSettingsService";
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

type StaffCategory = {
  name: string;
  description: string;
};

type RolePreset = {
  name: string;
  category: string;
  permissions: string[];
};

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

const defaultStaffCategories: StaffCategory[] = [
  { name: "Leadership", description: "Owners, directors, and senior decision makers" },
  { name: "Admin & Operations", description: "Office managers, operations coordinators, and general admin staff" },
  { name: "Scheduling & Dispatch", description: "People assigning jobs, engineers, calendars, and daily routes" },
  { name: "Customer Support", description: "Customer-facing support, service updates, and account help" },
  { name: "Engineers", description: "Field engineers, tradespeople, apprentices, and on-site workers" },
  { name: "Field Supervisors", description: "Senior engineers or supervisors managing work quality and teams" },
  { name: "Accounts & Billing", description: "Invoices, payments, subscriptions, and finance admin" },
  { name: "Marketing", description: "Campaigns, emails, discounts, and customer growth" },
  { name: "Personal Assistants", description: "PA users attached to a director, manager, or senior staff member" },
  { name: "Subcontractors", description: "Limited-access external workers or partner trades" },
];

const permissionGroups = [
  "Customer accounts",
  "Customer notes",
  "Jobs and scheduling",
  "Quotes and invoices",
  "Billing and subscriptions",
  "Discounts and free months",
  "Password resets",
  "Email customers",
  "Staff management",
  "Staff invites",
  "Security logs",
  "Audit logs",
  "Data exports",
  "Customer impersonation",
];

const defaultRolePresets: RolePreset[] = [
  { name: "Director / Owner", category: "Leadership", permissions: ["Full access"] },
  { name: "Office Manager", category: "Admin & Operations", permissions: ["Customer accounts", "Jobs and scheduling", "Quotes and invoices", "Staff invites"] },
  { name: "Operations Coordinator", category: "Admin & Operations", permissions: ["Customer accounts", "Jobs and scheduling", "Customer notes"] },
  { name: "Scheduler / Dispatcher", category: "Scheduling & Dispatch", permissions: ["Jobs and scheduling", "Customer accounts", "Customer notes"] },
  { name: "Customer Support", category: "Customer Support", permissions: ["Customer accounts", "Customer notes", "Password resets", "Email customers"] },
  { name: "Lead Engineer", category: "Field Supervisors", permissions: ["Jobs and scheduling", "Customer notes", "Quotes and invoices"] },
  { name: "Engineer", category: "Engineers", permissions: ["Jobs and scheduling", "Customer notes"] },
  { name: "Apprentice / Junior Engineer", category: "Engineers", permissions: ["Jobs and scheduling"] },
  { name: "Accounts / Billing", category: "Accounts & Billing", permissions: ["Quotes and invoices", "Billing and subscriptions"] },
  { name: "Marketing", category: "Marketing", permissions: ["Discounts and free months", "Email customers", "Customer notes"] },
  { name: "Personal Assistant", category: "Personal Assistants", permissions: ["Customer accounts", "Customer notes", "Jobs and scheduling"] },
  { name: "Subcontractor", category: "Subcontractors", permissions: ["Jobs and scheduling"] },
];

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
  const [activeTab, setActiveTab] = useState<SettingsTab>("business");
  const [activeStaffSettingsTab, setActiveStaffSettingsTab] = useState<StaffSettingsTab>("categories");
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
      setMessage("Settings saved.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save settings."));
    } finally {
      setSaving(false);
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
              {loading ? (
                <p className="text-slate-500">Loading settings...</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="max-h-40 overflow-y-auto break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                      {error}
                    </div>
                  )}
                  {message && (
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

                  {activeTab === "staff" && <StaffSettingsPanel activeTab={activeStaffSettingsTab} setActiveTab={setActiveStaffSettingsTab} />}
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

function StaffSettingsPanel({ activeTab, setActiveTab }: { activeTab: StaffSettingsTab; setActiveTab: (tab: StaffSettingsTab) => void }) {
  const [categories, setCategories] = useState<StaffCategory[]>(defaultStaffCategories);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [rolePresets, setRolePresets] = useState<RolePreset[]>(defaultRolePresets);
  const [roleName, setRoleName] = useState("");
  const [roleCategory, setRoleCategory] = useState(defaultStaffCategories[0]?.name ?? "");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  function addCategory() {
    const name = categoryName.trim();
    if (name === "" || categories.some(category => category.name.toLowerCase() === name.toLowerCase())) return;

    setCategories(previous => [
      ...previous,
      { name, description: categoryDescription.trim() || "Custom staff category" },
    ]);

    if (roleCategory === "") {
      setRoleCategory(name);
    }

    setCategoryName("");
    setCategoryDescription("");
  }

  function deleteCategory(categoryNameToDelete: string) {
    const rolesUsingCategory = rolePresets.filter(role => role.category === categoryNameToDelete).length;
    const warning = rolesUsingCategory > 0
      ? `Delete ${categoryNameToDelete}? This will also remove ${rolesUsingCategory} role preset(s) in this category.`
      : `Delete ${categoryNameToDelete}?`;

    if (!window.confirm(warning)) return;

    const fallback = categories.find(category => category.name !== categoryNameToDelete)?.name ?? "";
    setCategories(previous => previous.filter(category => category.name !== categoryNameToDelete));
    setRolePresets(previous => previous.filter(role => role.category !== categoryNameToDelete));

    if (roleCategory === categoryNameToDelete) {
      setRoleCategory(fallback);
    }
  }

  function togglePermission(permission: string) {
    setSelectedPermissions(previous =>
      previous.includes(permission)
        ? previous.filter(item => item !== permission)
        : [...previous, permission]
    );
  }

  function addRolePreset() {
    const name = roleName.trim();
    if (name === "" || roleCategory === "" || selectedPermissions.length === 0) return;

    setRolePresets(previous => [
      { name, category: roleCategory, permissions: selectedPermissions },
      ...previous.filter(role => role.name.toLowerCase() !== name.toLowerCase()),
    ]);

    setRoleName("");
    setSelectedPermissions([]);
  }

  function deleteRolePreset(roleNameToDelete: string) {
    if (!window.confirm(`Delete the ${roleNameToDelete} role preset?`)) return;
    setRolePresets(previous => previous.filter(role => role.name !== roleNameToDelete));
  }

  return (
    <SettingsPanel title="Staff settings">
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        Set up trade-business staff categories and role permission presets. These are templates only — individual staff can still have custom permissions in the staff admin portal.
      </div>

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

      {activeTab === "categories" && (
        <div className="mt-6 space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            {categories.map(category => (
              <div key={category.name} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{category.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{category.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteCategory(category.name)}
                    className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
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
            <button type="button" onClick={addCategory} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Add category
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
                <select value={roleCategory} onChange={event => setRoleCategory(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600">
                  {categories.map(category => <option key={category.name} value={category.name}>{category.name}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Default permissions</p>
              <div className="flex flex-wrap gap-2">
                {permissionGroups.map(permission => (
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

            <button type="button" onClick={addRolePreset} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300" disabled={roleCategory === ""}>
              Add role preset
            </button>
          </div>

          <div className="grid gap-3">
            {rolePresets.map(role => (
              <div key={`${role.category}-${role.name}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{role.name}</p>
                    <p className="text-sm text-slate-600">{role.category}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteRolePreset(role.name)}
                    className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
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
          {permissionGroups.map(permission => (
            <div key={permission} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{permission}</p>
              <p className="mt-1 text-sm text-slate-600">Use this permission group when creating role presets or individual staff overrides.</p>
            </div>
          ))}
        </div>
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
