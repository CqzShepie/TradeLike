import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Building2, CreditCard, Download, Palette, Users } from "lucide-react";

import Sidebar from "../layout/Sidebar";
import { Button, InlineAlert, PageHeader, PageShell, PanelCard, SelectInput, TextArea, TextInput } from "../ui";
import { settingsService } from "../../services/settingsService";
import type {
  CustomerSettings,
  UpdateAccountSettingsRequest,
  UpdateBusinessProfileSettingsRequest,
  UpdateCustomerSettingsTeamMemberRequest,
  UpdateDocumentDefaultsSettingsRequest,
  UpdateInventoryDefaultsSettingsRequest,
  UpdateJobDefaultsSettingsRequest,
  UpdateReportDefaultsSettingsRequest,
} from "../../types/settings";
import { getCustomerRoleLabel, getCustomerRoleOptions } from "../../utils/customerRoleLabels";
import { normalizePlan } from "../../routes/planEntitlements";

type SectionId =
  | "account"
  | "business"
  | "security"
  | "billing"
  | "team"
  | "job-defaults"
  | "documents"
  | "reports"
  | "inventory"
  | "branding"
  | "data"
  | "notifications";

export default function CustomerSettingsWorkspace({ focusSectionId }: { focusSectionId?: SectionId }) {
  const [settings, setSettings] = useState<CustomerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingSection, setSavingSection] = useState<SectionId | null>(null);
  const [accountForm, setAccountForm] = useState<UpdateAccountSettingsRequest>({ firstName: "", lastName: "", businessName: "", ownerName: "", ownerPhone: "" });
  const [businessForm, setBusinessForm] = useState<UpdateBusinessProfileSettingsRequest>({ businessName: "", legalName: "", ownerName: "", ownerPhone: "", phone: "", email: "", addressLine1: "", addressLine2: "", town: "", county: "", postcode: "", country: "United Kingdom", website: "", vatNumber: "", companyNumber: "" });
  const [jobDefaultsForm, setJobDefaultsForm] = useState<UpdateJobDefaultsSettingsRequest>({ defaultJobPriority: "Normal", defaultScheduleView: "Week" });
  const [documentForm, setDocumentForm] = useState<UpdateDocumentDefaultsSettingsRequest>({ defaultVatRate: 20, quotePrefix: "Q", invoicePrefix: "INV", quoteExpiryDays: 30, paymentTerms: "", defaultQuoteNotes: "", defaultInvoiceNotes: "", replyToEmail: "", emailFooter: "" });
  const [reportForm, setReportForm] = useState<UpdateReportDefaultsSettingsRequest>({ defaultReportRange: "30d", includeCompletedInReports: true, includeArchivedInReports: false });
  const [inventoryForm, setInventoryForm] = useState<UpdateInventoryDefaultsSettingsRequest>({ lowStockThreshold: 5, purchaseOrderPrefix: "PO" });

  useEffect(() => {
    let cancelled = false;

    settingsService.getSettings()
      .then(result => {
        if (cancelled) return;
        hydrate(result);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const plan = normalizePlan(settings?.planBilling.planName);
  const isTeamPlus = plan !== "Solo";
  const isBusinessPlus = plan === "Business" || plan === "Enterprise";
  const isEnterprise = plan === "Enterprise";

  const sections = useMemo(() => {
    const all: Array<{ id: SectionId; title: string; description: string }> = [
      { id: "account", title: "Account", description: "Profile, owner details and account identity." },
      { id: "business", title: "Business profile", description: "Trading details, contact info and company records." },
      { id: "security", title: "Security", description: "Password, verification status and active session details." },
      { id: "billing", title: "Plan & billing", description: "Plan limits, seats and billing status." },
      { id: "team", title: "Team members", description: "Owner, manager and team member access for your company." },
      { id: "job-defaults", title: "Job defaults", description: "Default scheduling preferences for new work." },
      { id: "documents", title: "Quotes & invoices", description: "Document defaults, VAT, notes and reply-to email." },
      { id: "reports", title: "Reports", description: "Default reporting range and included data." },
      { id: "inventory", title: "Inventory", description: "Low stock defaults and purchase order prefix." },
      { id: "branding", title: "Branding", description: "Manage customer-facing brand details in the dedicated page." },
      { id: "data", title: "Data import / export", description: "Open import and export tools for your tenant data." },
      { id: "notifications", title: "Notifications", description: "System inboxes and document reply-to status." },
    ];

    return all.filter(section => {
      if (section.id === "team" || section.id === "job-defaults") return isTeamPlus;
      if (section.id === "reports" || section.id === "inventory" || section.id === "branding") return isBusinessPlus;
      return true;
    });
  }, [isBusinessPlus, isTeamPlus]);

  const visibleSections = focusSectionId ? sections.filter(section => section.id === focusSectionId) : sections;

  if (loading) {
    return <PageShell sidebar={<Sidebar />}><PageHeader eyebrow="Settings" title="Customer settings" description="Loading your workspace settings." /></PageShell>;
  }

  return (
    <PageShell sidebar={<Sidebar />}>
      <PageHeader eyebrow="Settings" title="Customer settings" description="Manage the parts of TradeLike your plan and role can actually use." />
      {error && <InlineAlert tone="error">{error}</InlineAlert>}
      {message && <InlineAlert tone="success">{message}</InlineAlert>}

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        {!focusSectionId && (
          <aside className="space-y-2 rounded-2xl border border-white/10 bg-slate-900/70 p-3">
            {sections.map(section => (
              <a key={section.id} href={`#${section.id}`} className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5 hover:text-white">
                {section.title}
              </a>
            ))}
          </aside>
        )}

        <div className="space-y-6">
          {settings && visibleSections.map(section => (
            <section id={section.id} key={section.id}>
              {section.id === "account" && <AccountPanel settings={settings} form={accountForm} saving={savingSection === "account"} onChange={setAccountForm} onSave={() => saveSection("account", async () => ({ account: await settingsService.updateAccount(accountForm) }))} />}
              {section.id === "business" && <BusinessPanel form={businessForm} saving={savingSection === "business"} onChange={setBusinessForm} onSave={() => saveSection("business", async () => ({ businessProfile: await settingsService.updateBusinessProfile(businessForm) }))} />}
              {section.id === "security" && <SecurityPanel settings={settings} />}
              {section.id === "billing" && <BillingPanel settings={settings} isEnterprise={isEnterprise} />}
              {section.id === "team" && <TeamPanel settings={settings} saving={savingSection === "team"} onUpdate={(id, payload) => saveSection("team", async () => { const updated = await settingsService.updateTeamMember(id, payload); return { teamMembers: settings.teamMembers.map(member => member.id === id ? updated : member) }; })} />}
              {section.id === "job-defaults" && <JobDefaultsPanel form={jobDefaultsForm} saving={savingSection === "job-defaults"} onChange={setJobDefaultsForm} onSave={() => saveSection("job-defaults", async () => ({ jobDefaults: await settingsService.updateJobDefaults(jobDefaultsForm) }))} />}
              {section.id === "documents" && <DocumentsPanel form={documentForm} saving={savingSection === "documents"} onChange={setDocumentForm} onSave={() => saveSection("documents", async () => ({ documentDefaults: await settingsService.updateDocumentDefaults(documentForm), businessProfile: { ...settings.businessProfile, defaultVatRate: documentForm.defaultVatRate, quotePrefix: documentForm.quotePrefix, invoicePrefix: documentForm.invoicePrefix, quoteExpiryDays: documentForm.quoteExpiryDays, defaultQuoteNotes: documentForm.defaultQuoteNotes, defaultInvoiceNotes: documentForm.defaultInvoiceNotes, replyToEmail: documentForm.replyToEmail, paymentTerms: documentForm.paymentTerms, emailFooter: documentForm.emailFooter } }))} />}
              {section.id === "reports" && <ReportsPanel form={reportForm} saving={savingSection === "reports"} onChange={setReportForm} onSave={() => saveSection("reports", async () => ({ reportDefaults: await settingsService.updateReportDefaults(reportForm) }))} />}
              {section.id === "inventory" && <InventoryPanel form={inventoryForm} saving={savingSection === "inventory"} onChange={setInventoryForm} onSave={() => saveSection("inventory", async () => ({ inventoryDefaults: await settingsService.updateInventoryDefaults(inventoryForm) }))} />}
              {section.id === "branding" && <LinkPanel icon={<Palette className="h-5 w-5" />} title="Branding" description="Colour, logo and customer-facing document appearance are already managed in the dedicated Branding page." primaryHref="/settings/branding" primaryLabel="Open branding" />}
              {section.id === "data" && <LinkPanel icon={<Download className="h-5 w-5" />} title="Data import / export" description={isBusinessPlus ? "Import customer data and export your tenant archive from the dedicated data tools page." : "Advanced import and full export tools unlock on Business plan. Core customer settings stay available here."} primaryHref={isBusinessPlus ? "/settings/import-export" : "/settings/billing"} primaryLabel={isBusinessPlus ? "Open data tools" : "View plans"} />}
              {section.id === "notifications" && <NotificationsPanel settings={settings} />}
            </section>
          ))}
        </div>
      </div>
    </PageShell>
  );

  async function saveSection(section: SectionId, action: () => Promise<Partial<CustomerSettings>>) {
    setSavingSection(section);
    setError("");
    setMessage("");

    try {
      const patch = await action();
      setSettings(previous => previous ? { ...previous, ...patch, account: patch.account ?? previous.account, businessProfile: patch.businessProfile ?? previous.businessProfile, jobDefaults: patch.jobDefaults ?? previous.jobDefaults, documentDefaults: patch.documentDefaults ?? previous.documentDefaults, reportDefaults: patch.reportDefaults ?? previous.reportDefaults, inventoryDefaults: patch.inventoryDefaults ?? previous.inventoryDefaults, teamMembers: patch.teamMembers ?? previous.teamMembers } : previous);
      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setSavingSection(null);
    }
  }

  function hydrate(result: CustomerSettings) {
    setSettings(result);
    setAccountForm({ firstName: result.account.firstName, lastName: result.account.lastName, businessName: result.account.businessName, ownerName: result.account.ownerName ?? "", ownerPhone: result.account.ownerPhone ?? "" });
    setBusinessForm({ businessName: result.businessProfile.businessName, legalName: result.businessProfile.legalName ?? "", ownerName: result.account.ownerName ?? "", ownerPhone: result.account.ownerPhone ?? "", phone: result.businessProfile.phone ?? "", email: result.businessProfile.email ?? "", addressLine1: result.businessProfile.addressLine1 ?? "", addressLine2: result.businessProfile.addressLine2 ?? "", town: result.businessProfile.town ?? "", county: result.businessProfile.county ?? "", postcode: result.businessProfile.postcode ?? "", country: result.businessProfile.country ?? "United Kingdom", website: result.businessProfile.website ?? "", vatNumber: result.businessProfile.vatNumber ?? "", companyNumber: result.businessProfile.companyNumber ?? "" });
    setJobDefaultsForm({ defaultJobPriority: result.jobDefaults.defaultJobPriority, defaultScheduleView: result.jobDefaults.defaultScheduleView });
    setDocumentForm({ defaultVatRate: result.documentDefaults.defaultVatRate, quotePrefix: result.documentDefaults.quotePrefix, invoicePrefix: result.documentDefaults.invoicePrefix, quoteExpiryDays: result.documentDefaults.quoteExpiryDays, paymentTerms: result.documentDefaults.paymentTerms ?? "", defaultQuoteNotes: result.documentDefaults.defaultQuoteNotes ?? "", defaultInvoiceNotes: result.documentDefaults.defaultInvoiceNotes ?? "", replyToEmail: result.documentDefaults.replyToEmail ?? "", emailFooter: result.documentDefaults.emailFooter ?? "" });
    setReportForm({ defaultReportRange: result.reportDefaults.defaultReportRange, includeCompletedInReports: result.reportDefaults.includeCompletedInReports, includeArchivedInReports: result.reportDefaults.includeArchivedInReports });
    setInventoryForm({ lowStockThreshold: result.inventoryDefaults.lowStockThreshold, purchaseOrderPrefix: result.inventoryDefaults.purchaseOrderPrefix });
  }
}

function AccountPanel({ settings, form, saving, onChange, onSave }: { settings: CustomerSettings; form: UpdateAccountSettingsRequest; saving: boolean; onChange: (value: UpdateAccountSettingsRequest) => void; onSave: () => void }) {
  return <PanelCard title="Account"><div className="grid gap-4 md:grid-cols-2"><Field label="First name"><TextInput value={form.firstName} onChange={event => onChange({ ...form, firstName: event.target.value })} /></Field><Field label="Last name"><TextInput value={form.lastName} onChange={event => onChange({ ...form, lastName: event.target.value })} /></Field><Field label="Business name"><TextInput value={form.businessName ?? ""} onChange={event => onChange({ ...form, businessName: event.target.value })} /></Field><Field label="Owner name"><TextInput value={form.ownerName ?? ""} onChange={event => onChange({ ...form, ownerName: event.target.value })} /></Field><Field label="Owner phone"><TextInput value={form.ownerPhone ?? ""} onChange={event => onChange({ ...form, ownerPhone: event.target.value })} /></Field><Field label="Email"><TextInput value={settings.account.email} disabled /></Field></div><div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300"><InfoPill>{getCustomerRoleLabel(settings.account.role, { role: settings.account.role, plan: settings.account.planName })}</InfoPill><InfoPill>{settings.account.accountStatus}</InfoPill><InfoPill>{settings.account.planName} plan</InfoPill></div><div className="mt-5"><Button onClick={onSave} loading={saving}>Save account</Button></div></PanelCard>;
}

function BusinessPanel({ form, saving, onChange, onSave }: { form: UpdateBusinessProfileSettingsRequest; saving: boolean; onChange: (value: UpdateBusinessProfileSettingsRequest) => void; onSave: () => void }) {
  return <PanelCard title="Business profile"><div className="grid gap-4 md:grid-cols-2"><Field label="Business name"><TextInput value={form.businessName} onChange={event => onChange({ ...form, businessName: event.target.value })} /></Field><Field label="Legal or trading name"><TextInput value={form.legalName ?? ""} onChange={event => onChange({ ...form, legalName: event.target.value })} /></Field><Field label="Business email"><TextInput value={form.email ?? ""} onChange={event => onChange({ ...form, email: event.target.value })} /></Field><Field label="Business phone"><TextInput value={form.phone ?? ""} onChange={event => onChange({ ...form, phone: event.target.value })} /></Field><Field label="Owner / contact name"><TextInput value={form.ownerName ?? ""} onChange={event => onChange({ ...form, ownerName: event.target.value })} /></Field><Field label="Owner phone"><TextInput value={form.ownerPhone ?? ""} onChange={event => onChange({ ...form, ownerPhone: event.target.value })} /></Field><Field label="Address line 1"><TextInput value={form.addressLine1 ?? ""} onChange={event => onChange({ ...form, addressLine1: event.target.value })} /></Field><Field label="Address line 2"><TextInput value={form.addressLine2 ?? ""} onChange={event => onChange({ ...form, addressLine2: event.target.value })} /></Field><Field label="Town / city"><TextInput value={form.town ?? ""} onChange={event => onChange({ ...form, town: event.target.value })} /></Field><Field label="County"><TextInput value={form.county ?? ""} onChange={event => onChange({ ...form, county: event.target.value })} /></Field><Field label="Postcode"><TextInput value={form.postcode ?? ""} onChange={event => onChange({ ...form, postcode: event.target.value })} /></Field><Field label="Country"><TextInput value={form.country ?? ""} onChange={event => onChange({ ...form, country: event.target.value })} /></Field><Field label="Website"><TextInput value={form.website ?? ""} onChange={event => onChange({ ...form, website: event.target.value })} /></Field><Field label="VAT number"><TextInput value={form.vatNumber ?? ""} onChange={event => onChange({ ...form, vatNumber: event.target.value })} /></Field><Field label="Company number"><TextInput value={form.companyNumber ?? ""} onChange={event => onChange({ ...form, companyNumber: event.target.value })} /></Field></div><div className="mt-5"><Button onClick={onSave} loading={saving}>Save business profile</Button></div></PanelCard>;
}

function SecurityPanel({ settings }: { settings: CustomerSettings }) {
  return <PanelCard title="Security"><div className="grid gap-4 md:grid-cols-2"><Metric label="Email verification" value={settings.security.isEmailVerified ? "Verified" : "Pending"} /><Metric label="Password reset required" value={settings.security.passwordResetRequired ? "Yes" : "No"} /><Metric label="Last sign-in" value={formatDateTime(settings.security.lastLoginAtUtc) || "No recent sign-in"} /><Metric label="Session expires" value={formatDateTime(settings.security.sessionExpiresAtUtc) || "Not available"} /></div><div className="mt-5 flex flex-wrap gap-3"><LinkButton to="/forgot-password">Change password</LinkButton><Button variant="secondary" onClick={() => window.location.assign("/login")}>Clear local session</Button></div></PanelCard>;
}

function BillingPanel({ settings, isEnterprise }: { settings: CustomerSettings; isEnterprise: boolean }) {
  return <PanelCard title="Plan & billing"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Metric label="Plan" value={settings.planBilling.planName} /><Metric label="Billing status" value={settings.planBilling.billingStatus} /><Metric label="Seats" value={String(settings.planBilling.seatsPurchased)} /><Metric label="Included users" value={settings.planBilling.maxIncludedUsers == null ? "Unlimited" : String(settings.planBilling.maxIncludedUsers)} /></div><p className="mt-5 text-sm text-slate-300">Current billing cycle started {formatDate(settings.planBilling.billingStartUtc) || "recently"} and renews on {formatDate(settings.planBilling.nextInvoiceDateUtc) || "your next invoice date"}.</p>{isEnterprise && <div className="mt-5 rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-100">Enterprise workspace: priority support and compliance help route through your account team.</div>}<div className="mt-5"><LinkButton to="/settings/billing" icon={<CreditCard className="h-4 w-4" />}>Manage billing</LinkButton></div></PanelCard>;
}

function TeamPanel({ settings, saving, onUpdate }: { settings: CustomerSettings; saving: boolean; onUpdate: (id: number, payload: UpdateCustomerSettingsTeamMemberRequest) => void }) {
  const roleOptions = getCustomerRoleOptions().filter(option => option.value !== "CustomerDirector");
  return <PanelCard title="Team members"><div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/50 p-4"><div><p className="font-semibold text-white">Customer app roles</p><p className="text-sm text-slate-300">Owner, Manager and Team Member are customer-facing labels only. Internal Studio roles stay separate.</p></div><LinkButton to="/team" icon={<Users className="h-4 w-4" />}>Open team workspace</LinkButton></div><div className="space-y-3">{settings.teamMembers.map(member => <div key={member.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-white">{member.name}</p><p className="text-sm text-slate-300">{member.email}</p><p className="mt-1 text-xs font-semibold text-blue-200">{getCustomerRoleLabel(member.role, { role: member.role, plan: settings.planBilling.planName })}{member.isCurrentUser ? " • You" : ""}</p></div><div className="grid gap-2 sm:grid-cols-2">{member.canEditRole ? <SelectInput aria-label={`${member.name} role`} defaultValue={member.role} onChange={event => onUpdate(member.id, { role: event.target.value as UpdateCustomerSettingsTeamMemberRequest["role"], status: member.status as UpdateCustomerSettingsTeamMemberRequest["status"] })} disabled={saving}>{roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectInput> : <InfoPill>{getCustomerRoleLabel(member.role, { role: member.role, plan: settings.planBilling.planName })}</InfoPill>}{member.canEditStatus ? <SelectInput aria-label={`${member.name} status`} defaultValue={member.status} onChange={event => onUpdate(member.id, { role: member.role === "CustomerManager" ? "CustomerManager" : "CustomerEmployee", status: event.target.value as UpdateCustomerSettingsTeamMemberRequest["status"] })} disabled={saving}><option value="Active">Active</option><option value="Suspended">Suspended</option><option value="Cancelled">Cancelled</option></SelectInput> : <InfoPill>{member.status}</InfoPill>}</div></div></div>)}</div></PanelCard>;
}

function JobDefaultsPanel({ form, saving, onChange, onSave }: { form: UpdateJobDefaultsSettingsRequest; saving: boolean; onChange: (value: UpdateJobDefaultsSettingsRequest) => void; onSave: () => void }) {
  return <PanelCard title="Job defaults"><div className="grid gap-4 md:grid-cols-2"><Field label="Default priority"><SelectInput value={form.defaultJobPriority} onChange={event => onChange({ ...form, defaultJobPriority: event.target.value })}><option value="Low">Low</option><option value="Normal">Normal</option><option value="High">High</option></SelectInput></Field><Field label="Default schedule view"><SelectInput value={form.defaultScheduleView} onChange={event => onChange({ ...form, defaultScheduleView: event.target.value })}><option value="Week">Week</option><option value="Day">Day</option></SelectInput></Field></div><div className="mt-5"><Button onClick={onSave} loading={saving}>Save job defaults</Button></div></PanelCard>;
}

function DocumentsPanel({ form, saving, onChange, onSave }: { form: UpdateDocumentDefaultsSettingsRequest; saving: boolean; onChange: (value: UpdateDocumentDefaultsSettingsRequest) => void; onSave: () => void }) {
  return <PanelCard title="Quotes & invoices"><div className="grid gap-4 md:grid-cols-2"><Field label="Default VAT rate"><TextInput type="number" value={String(form.defaultVatRate)} onChange={event => onChange({ ...form, defaultVatRate: Number(event.target.value || 0) })} /></Field><Field label="Quote expiry days"><TextInput type="number" value={String(form.quoteExpiryDays)} onChange={event => onChange({ ...form, quoteExpiryDays: Number(event.target.value || 0) })} /></Field><Field label="Quote prefix"><TextInput value={form.quotePrefix} onChange={event => onChange({ ...form, quotePrefix: event.target.value })} /></Field><Field label="Invoice prefix"><TextInput value={form.invoicePrefix} onChange={event => onChange({ ...form, invoicePrefix: event.target.value })} /></Field><Field label="Reply-to email"><TextInput value={form.replyToEmail ?? ""} onChange={event => onChange({ ...form, replyToEmail: event.target.value })} /></Field><Field label="Payment terms"><TextInput value={form.paymentTerms ?? ""} onChange={event => onChange({ ...form, paymentTerms: event.target.value })} /></Field></div><div className="mt-4 grid gap-4"><Field label="Default quote notes"><TextArea value={form.defaultQuoteNotes ?? ""} onChange={event => onChange({ ...form, defaultQuoteNotes: event.target.value })} rows={4} /></Field><Field label="Default invoice notes"><TextArea value={form.defaultInvoiceNotes ?? ""} onChange={event => onChange({ ...form, defaultInvoiceNotes: event.target.value })} rows={4} /></Field><Field label="Email footer"><TextArea value={form.emailFooter ?? ""} onChange={event => onChange({ ...form, emailFooter: event.target.value })} rows={4} /></Field></div><div className="mt-5"><Button onClick={onSave} loading={saving}>Save document defaults</Button></div></PanelCard>;
}

function ReportsPanel({ form, saving, onChange, onSave }: { form: UpdateReportDefaultsSettingsRequest; saving: boolean; onChange: (value: UpdateReportDefaultsSettingsRequest) => void; onSave: () => void }) {
  return <PanelCard title="Reports"><div className="grid gap-4 md:grid-cols-2"><Field label="Default date range"><SelectInput value={form.defaultReportRange} onChange={event => onChange({ ...form, defaultReportRange: event.target.value })}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="12m">Last 12 months</option></SelectInput></Field><Toggle label="Include completed jobs" checked={form.includeCompletedInReports} onChange={checked => onChange({ ...form, includeCompletedInReports: checked })} /><Toggle label="Include archived data" checked={form.includeArchivedInReports} onChange={checked => onChange({ ...form, includeArchivedInReports: checked })} /></div><div className="mt-5"><Button onClick={onSave} loading={saving}>Save report defaults</Button></div></PanelCard>;
}

function InventoryPanel({ form, saving, onChange, onSave }: { form: UpdateInventoryDefaultsSettingsRequest; saving: boolean; onChange: (value: UpdateInventoryDefaultsSettingsRequest) => void; onSave: () => void }) {
  return <PanelCard title="Inventory"><div className="grid gap-4 md:grid-cols-2"><Field label="Low stock threshold"><TextInput type="number" value={String(form.lowStockThreshold)} onChange={event => onChange({ ...form, lowStockThreshold: Number(event.target.value || 0) })} /></Field><Field label="Purchase order prefix"><TextInput value={form.purchaseOrderPrefix} onChange={event => onChange({ ...form, purchaseOrderPrefix: event.target.value })} /></Field></div><div className="mt-5 flex flex-wrap gap-3"><Button onClick={onSave} loading={saving}>Save inventory defaults</Button><LinkButton to="/inventory" icon={<Building2 className="h-4 w-4" />}>Open inventory</LinkButton></div></PanelCard>;
}

function NotificationsPanel({ settings }: { settings: CustomerSettings }) {
  return <PanelCard title="Notifications"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Metric label="Automated sender" value={settings.notifications.automatedSenderEmail} /><Metric label="Support inbox" value={settings.notifications.supportInboxEmail} /><Metric label="Sales inbox" value={settings.notifications.salesInboxEmail} /><Metric label="General inbox" value={settings.notifications.generalInboxEmail} /><Metric label="Business reply-to" value={settings.notifications.businessReplyToEmail || "Support inbox fallback"} /><Metric label="Email status" value={settings.notifications.emailStatus} /></div><p className="mt-5 text-sm text-slate-300">Sensitive provider credentials stay server-side and are never exposed here.</p></PanelCard>;
}

function LinkPanel({ icon, title, description, primaryHref, primaryLabel }: { icon: ReactNode; title: string; description: string; primaryHref: string; primaryLabel: string }) {
  return <PanelCard title={title}><div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/50 p-4"><div className="flex gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-blue-200">{icon}</span><p className="max-w-2xl text-sm leading-6 text-slate-300">{description}</p></div><LinkButton to={primaryHref}>{primaryLabel}</LinkButton></div></PanelCard>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">{label}</span>{children}</label>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-white">{value}</p></div>;
}

function InfoPill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-100">{children}</span>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-slate-950" />{label}</label>;
}

function LinkButton({ to, children, icon }: { to: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return <Link to={to} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10">{icon}{children}</Link>;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB");
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}
