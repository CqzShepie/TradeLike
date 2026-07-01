import { useMemo, useState } from "react";
import { Eye, Save } from "lucide-react";

import Sidebar from "../../../components/layout/Sidebar";
import { Button, InlineAlert, PageHeader, PageShell, PanelCard, SelectInput, TextArea, TextInput } from "../../../components/ui";
import { apiClient } from "../../../services/apiClient";

const eventOptions = ["invoice.created", "invoice.updated", "job.created", "customer.created"];

export default function WebhookDesignerPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("Paid invoice webhook");
  const [triggerEvent, setTriggerEvent] = useState("invoice.updated");
  const [filterJson, setFilterJson] = useState('{"field":"status","operator":"==","value":"Paid"}');
  const [transformJson, setTransformJson] = useState('{"fields":[{"target":"status","source":"status"},{"target":"total","source":"total"}]}');
  const [sampleJson, setSampleJson] = useState('{"status":"Paid","total":120}');
  const [targetUrl, setTargetUrl] = useState("https://example.com/webhooks/tradelike");
  const [signatureSecret, setSignatureSecret] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    try {
      return JSON.stringify(transform(JSON.parse(transformJson), JSON.parse(sampleJson)), null, 2);
    } catch {
      return "{}";
    }
  }, [sampleJson, transformJson]);

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      await apiClient.post("/webhooks/workflows", {
        name,
        triggerEvent,
        filterJson,
        transformJson,
        targetUrl,
        signatureSecret,
        enabled: true,
      });
      setMessage("Webhook workflow saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save webhook workflow.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell sidebar={<Sidebar />}>
      <PageHeader eyebrow="Settings" title="Webhook Designer" description="Build event filters, payload transforms and signed webhook targets." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PanelCard title={`Step ${step}`}>
          {message && <InlineAlert tone="success">{message}</InlineAlert>}
          {error && <InlineAlert tone="error">{error}</InlineAlert>}

          {step === 1 && (
            <div className="space-y-4">
              <TextInput value={name} onChange={event => setName(event.target.value)} aria-label="Webhook name" />
              <SelectInput value={triggerEvent} onChange={event => setTriggerEvent(event.target.value)} aria-label="Trigger event">
                {eventOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </SelectInput>
            </div>
          )}

          {step === 2 && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Filter JSON</span>
              <TextArea value={filterJson} onChange={event => setFilterJson(event.target.value)} rows={8} />
            </label>
          )}

          {step === 3 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Transform JSON</span>
                <TextArea value={transformJson} onChange={event => setTransformJson(event.target.value)} rows={9} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Sample payload</span>
                <TextArea value={sampleJson} onChange={event => setSampleJson(event.target.value)} rows={9} />
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <TextInput value={targetUrl} onChange={event => setTargetUrl(event.target.value)} aria-label="Target URL" />
              <TextInput value={signatureSecret} onChange={event => setSignatureSecret(event.target.value)} aria-label="Signature secret" placeholder="Auto-generated when blank" />
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setStep(Math.max(1, step - 1))}>Back</Button>
            <Button variant="secondary" onClick={() => setStep(Math.min(4, step + 1))}>Next</Button>
            <Button onClick={save} loading={saving}>
              <Save className="mr-2 h-4 w-4" />
              Save webhook
            </Button>
          </div>
        </PanelCard>

        <PanelCard title="Preview">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Eye className="h-4 w-4" />
            Transformed JSON
          </div>
          <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-50" data-testid="transform-preview">
            {preview}
          </pre>
        </PanelCard>
      </div>
    </PageShell>
  );
}

function transform(definition: { fields?: Array<{ target: string; source?: string; constant?: unknown }> }, sample: Record<string, unknown>) {
  const output: Record<string, unknown> = {};

  for (const field of definition.fields ?? []) {
    if (field.constant !== undefined) {
      output[field.target] = field.constant;
    } else if (field.source) {
      output[field.target] = readPath(sample, field.source);
    }
  }

  return output;
}

function readPath(value: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, value);
}
