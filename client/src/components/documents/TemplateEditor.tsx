import { useMemo, useState } from "react";

export type TemplateEditorValue = {
  name: string;
  type: "Quote" | "Invoice" | "JobSheet" | "Certificate";
  htmlTemplate: string;
};

type TemplateEditorProps = {
  value?: TemplateEditorValue;
  onSave: (value: TemplateEditorValue) => Promise<void> | void;
};

const defaultTemplate = `<section>
  <h1>{{Quote.Title}}</h1>
  <p>Customer: {{Quote.CustomerName}}</p>
  <p>Total: {{Quote.Total}}</p>
</section>`;

export default function TemplateEditor({ value, onSave }: TemplateEditorProps) {
  const [draft, setDraft] = useState<TemplateEditorValue>(
    value ?? { name: "Quote template", type: "Quote", htmlTemplate: defaultTemplate }
  );
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => renderPreview(draft.htmlTemplate), [draft.htmlTemplate]);

  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={saveTemplate} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Template editor</h2>
        <label className="mt-4 block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Name</span>
          <input
            value={draft.name}
            onChange={event => setDraft({ ...draft, name: event.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Type</span>
          <select
            value={draft.type}
            onChange={event => setDraft({ ...draft, type: event.target.value as TemplateEditorValue["type"] })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
          >
            <option value="Quote">Quote</option>
            <option value="Invoice">Invoice</option>
            <option value="JobSheet">Job sheet</option>
            <option value="Certificate">Certificate</option>
          </select>
        </label>
        <label className="mt-4 block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">HTML</span>
          <textarea
            value={draft.htmlTemplate}
            onChange={event => setDraft({ ...draft, htmlTemplate: event.target.value })}
            rows={16}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-600"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600 disabled:bg-slate-300"
        >
          {saving ? "Saving" : "Save template"}
        </button>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Live preview</h2>
        <div
          data-testid="template-preview"
          className="mt-4 min-h-96 rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-800"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      </section>
    </form>
  );
}

function renderPreview(html: string) {
  return html
    .replaceAll("{{Quote.Title}}", "Boiler replacement")
    .replaceAll("{{Quote.CustomerName}}", "Avery Homes")
    .replaceAll("{{Quote.Total}}", "1250")
    .replaceAll("{{Invoice.InvoiceNumber}}", "INV-1042")
    .replaceAll("{{Invoice.CustomerName}}", "Avery Homes")
    .replaceAll("{{Invoice.TotalPence}}", "125000")
    .replaceAll("{{Job.JobTitle}}", "Annual service")
    .replaceAll("{{Job.Address}}", "14 Market Street");
}
