import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Save } from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import { Button, InlineAlert, PageHeader, PageShell, PanelCard, TextInput } from "../../components/ui";
import { apiClient } from "../../services/apiClient";

type BrandingProfile = {
  tenantId: number;
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  supportEmail: string;
  customDomain: string;
  hideTradeLikeBranding: boolean;
  updatedAtUtc: string;
};

const blankProfile: BrandingProfile = {
  tenantId: 0,
  brandName: "TradeLike",
  logoUrl: "",
  primaryColor: "#2563eb",
  accentColor: "#14b8a6",
  supportEmail: "",
  customDomain: "",
  hideTradeLikeBranding: false,
  updatedAtUtc: new Date().toISOString(),
};

export default function BrandingPage() {
  const [profile, setProfile] = useState<BrandingProfile>(blankProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    apiClient.get<BrandingProfile>("/branding")
      .then(result => {
        if (!cancelled) {
          setProfile(normalizeProfile(result));
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(getErrorMessage(err, "Unable to load branding."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved = await apiClient.put<BrandingProfile>("/branding", profile);
      setProfile(normalizeProfile(saved));
      setMessage("Branding saved.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save branding."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell sidebar={<Sidebar />}>
      <PageHeader
        eyebrow="Brand"
        title="White-label Branding"
        description="Set the tenant-facing name, colours, logo and custom domain details."
      />

      {loading ? (
        <PanelCard title="Branding">
          <p className="text-sm text-slate-600">Loading branding...</p>
        </PanelCard>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <PanelCard title="Brand profile">
            <form className="space-y-5" onSubmit={saveProfile}>
              {error && <InlineAlert tone="error">{error}</InlineAlert>}
              {message && <InlineAlert tone="success">{message}</InlineAlert>}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Brand name">
                  <TextInput value={profile.brandName} onChange={event => setField("brandName", event.target.value)} />
                </Field>
                <Field label="Support email">
                  <TextInput value={profile.supportEmail} onChange={event => setField("supportEmail", event.target.value)} type="email" />
                </Field>
                <Field label="Logo URL">
                  <TextInput value={profile.logoUrl} onChange={event => setField("logoUrl", event.target.value)} />
                </Field>
                <Field label="Custom domain">
                  <TextInput value={profile.customDomain} onChange={event => setField("customDomain", event.target.value)} placeholder="portal.example.com" />
                </Field>
                <Field label="Primary colour">
                  <ColourInput value={profile.primaryColor} onChange={value => setField("primaryColor", value)} />
                </Field>
                <Field label="Accent colour">
                  <ColourInput value={profile.accentColor} onChange={value => setField("accentColor", value)} />
                </Field>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={profile.hideTradeLikeBranding}
                  onChange={event => setField("hideTradeLikeBranding", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                Hide TradeLike platform branding
              </label>

              <Button type="submit" loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Save branding
              </Button>
            </form>
          </PanelCard>

          <PanelCard title="Preview">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="px-5 py-6 text-white" style={{ backgroundColor: profile.primaryColor }}>
                <div className="flex items-center gap-3">
                  {profile.logoUrl ? (
                    <img src={profile.logoUrl} alt="" className="h-12 w-12 rounded-lg bg-white object-contain p-1" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/15 text-lg font-bold">
                      {profile.brandName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-xl font-bold">{profile.brandName}</p>
                    <p className="text-sm text-white/80">{profile.customDomain || "portal.tradelike.app"}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Customer portal</p>
                  <p className="mt-1 text-sm text-slate-600">Support: {profile.supportEmail || "support@tradelike.app"}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: profile.accentColor }}
                >
                  Open workspace
                </button>
                {!profile.hideTradeLikeBranding && (
                  <p className="text-xs font-semibold uppercase text-slate-400">Powered by TradeLike</p>
                )}
              </div>
            </div>
          </PanelCard>
        </div>
      )}
    </PageShell>
  );

  function setField<Key extends keyof BrandingProfile>(key: Key, value: BrandingProfile[Key]) {
    setProfile(previous => ({ ...previous, [key]: value }));
    setError("");
    setMessage("");
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ColourInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-3">
      <input
        type="color"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white p-1 shadow-sm"
      />
      <TextInput value={value} onChange={event => onChange(event.target.value)} />
    </div>
  );
}

function normalizeProfile(profile: BrandingProfile): BrandingProfile {
  return {
    ...blankProfile,
    ...profile,
    primaryColor: profile.primaryColor || blankProfile.primaryColor,
    accentColor: profile.accentColor || blankProfile.accentColor,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== "" ? error.message : fallback;
}
