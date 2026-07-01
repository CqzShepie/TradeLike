import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Clipboard, KeyRound, Send, Trash2 } from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import { Button, InlineAlert, PageHeader, PageShell, PanelCard, TextInput } from "../../components/ui";
import { apiClient } from "../../services/apiClient";

type ApiClient = {
  id: number;
  clientId: string;
  name: string;
  scopes: string[];
  isActive: boolean;
  createdAtUtc: string;
  lastUsedAtUtc: string | null;
};

type CreatedApiClient = ApiClient & {
  clientSecret: string;
};

type WebhookSubscription = {
  id: number;
  targetUrl: string;
  events: string[];
  isActive: boolean;
  createdAtUtc: string;
  lastDeliveryAtUtc: string | null;
};

type CreatedWebhookSubscription = WebhookSubscription & {
  signingSecret: string;
};

const scopeOptions = ["customers:read", "jobs:read", "invoices:read", "webhooks:write"];
const eventOptions = ["customer.created", "job.created", "invoice.created", "import.completed"];

export default function ApiDeveloperPage() {
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientScopes, setClientScopes] = useState<string[]>(scopeOptions);
  const [targetUrl, setTargetUrl] = useState("");
  const [events, setEvents] = useState<string[]>(eventOptions);
  const [secret, setSecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [clientRows, webhookRows] = await Promise.all([
        apiClient.get<ApiClient[]>("/public-api/clients"),
        apiClient.get<WebhookSubscription[]>("/webhooks"),
      ]);
      setClients(clientRows);
      setWebhooks(webhookRows);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load API developer settings."));
    } finally {
      setLoading(false);
    }
  }

  async function createClient(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    setSecret("");

    try {
      const created = await apiClient.post<CreatedApiClient>("/public-api/clients", {
        name: clientName,
        scopes: clientScopes,
      });
      setClients(previous => [created, ...previous]);
      setSecret(`${created.clientId}\n${created.clientSecret}`);
      setClientName("");
      setMessage("API client created.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create API client."));
    } finally {
      setSaving(false);
    }
  }

  async function revokeClient(client: ApiClient) {
    setError("");

    try {
      await apiClient.delete<void>(`/public-api/clients/${client.id}`);
      setClients(previous => previous.map(item => item.id === client.id ? { ...item, isActive: false } : item));
      setMessage("API client revoked.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to revoke API client."));
    }
  }

  async function subscribeWebhook(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    setWebhookSecret("");

    try {
      const created = await apiClient.post<CreatedWebhookSubscription>("/webhooks/subscribe", {
        targetUrl,
        events,
      });
      setWebhooks(previous => [created, ...previous]);
      setWebhookSecret(created.signingSecret);
      setTargetUrl("");
      setMessage("Webhook subscribed.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to subscribe webhook."));
    } finally {
      setSaving(false);
    }
  }

  async function testWebhook(webhook: WebhookSubscription) {
    setError("");

    try {
      await apiClient.post<void>(`/webhooks/${webhook.id}/test`, {});
      setMessage("Test webhook queued.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to queue test webhook."));
    }
  }

  async function disableWebhook(webhook: WebhookSubscription) {
    setError("");

    try {
      await apiClient.delete<void>(`/webhooks/${webhook.id}`);
      setWebhooks(previous => previous.map(item => item.id === webhook.id ? { ...item, isActive: false } : item));
      setMessage("Webhook disabled.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to disable webhook."));
    }
  }

  return (
    <PageShell sidebar={<Sidebar />}>
      <PageHeader
        eyebrow="Developers"
        title="Public API & Webhooks"
        description="Manage client credentials and outbound event subscriptions."
        actions={<Button variant="secondary" onClick={load}>Refresh</Button>}
      />

      <div className="space-y-6">
        {error && <InlineAlert tone="error">{error}</InlineAlert>}
        {message && <InlineAlert tone="success">{message}</InlineAlert>}

        <div className="grid gap-6 xl:grid-cols-2">
          <PanelCard title="API clients">
            <form className="space-y-5" onSubmit={createClient}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Client name</span>
                <TextInput value={clientName} onChange={event => setClientName(event.target.value)} />
              </label>

              <CheckboxGroup
                label="Scopes"
                options={scopeOptions}
                selected={clientScopes}
                onChange={setClientScopes}
              />

              <Button type="submit" loading={saving} disabled={clientName.trim().length === 0}>
                <KeyRound className="mr-2 h-4 w-4" />
                Create client
              </Button>
            </form>

            {secret && (
              <SecretBox title="New client credentials" value={secret} />
            )}

            <div className="mt-6 space-y-3">
              {loading ? (
                <p className="text-sm text-slate-600">Loading clients...</p>
              ) : clients.length === 0 ? (
                <p className="text-sm text-slate-600">No API clients yet.</p>
              ) : clients.map(client => (
                <div key={client.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{client.name}</p>
                      <p className="mt-1 break-all text-sm text-slate-600">{client.clientId}</p>
                    </div>
                    {client.isActive && (
                      <Button variant="secondary" size="sm" onClick={() => revokeClient(client)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Revoke
                      </Button>
                    )}
                  </div>
                  <PillRow items={[client.isActive ? "Active" : "Revoked", ...client.scopes]} />
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard title="Webhooks">
            <form className="space-y-5" onSubmit={subscribeWebhook}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Target URL</span>
                <TextInput value={targetUrl} onChange={event => setTargetUrl(event.target.value)} placeholder="https://example.com/webhooks/tradelike" />
              </label>

              <CheckboxGroup
                label="Events"
                options={eventOptions}
                selected={events}
                onChange={setEvents}
              />

              <Button type="submit" loading={saving} disabled={targetUrl.trim().length === 0 || events.length === 0}>
                <Send className="mr-2 h-4 w-4" />
                Subscribe
              </Button>
            </form>

            {webhookSecret && (
              <SecretBox title="New signing secret" value={webhookSecret} />
            )}

            <div className="mt-6 space-y-3">
              {loading ? (
                <p className="text-sm text-slate-600">Loading webhooks...</p>
              ) : webhooks.length === 0 ? (
                <p className="text-sm text-slate-600">No webhooks yet.</p>
              ) : webhooks.map(webhook => (
                <div key={webhook.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="break-all font-semibold text-slate-950">{webhook.targetUrl}</p>
                      <p className="mt-1 text-sm text-slate-600">{formatDate(webhook.createdAtUtc)}</p>
                    </div>
                    {webhook.isActive && (
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => testWebhook(webhook)}>Test</Button>
                        <Button variant="secondary" size="sm" onClick={() => disableWebhook(webhook)}>Disable</Button>
                      </div>
                    )}
                  </div>
                  <PillRow items={[webhook.isActive ? "Active" : "Disabled", ...webhook.events]} />
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>
    </PageShell>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  function toggle(option: string) {
    onChange(selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option]);
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-slate-700">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={[
              "rounded-lg border px-3 py-2 text-xs font-semibold transition",
              selected.includes(option)
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function SecretBox({ title, value }: { title: string; value: string }) {
  async function copy() {
    await navigator.clipboard.writeText(value);
  }

  return (
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-amber-950">{title}</p>
        <Button variant="secondary" size="sm" onClick={copy}>
          <Clipboard className="mr-2 h-4 w-4" />
          Copy
        </Button>
      </div>
      <pre className="mt-3 overflow-auto rounded-lg bg-white p-3 text-xs text-slate-800">{value}</pre>
    </div>
  );
}

function PillRow({ items }: { items: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map(item => (
        <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {item}
        </span>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString("en-GB");
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== "" ? error.message : fallback;
}
