import { useEffect, useState } from "react";

import TemplateEditor, { type TemplateEditorValue } from "../../../components/documents/TemplateEditor";
import { apiClient } from "../../../services/apiClient";

type Template = TemplateEditorValue & {
  id: number;
  createdAtUtc: string;
};

export default function TemplatesSettingsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedType, setSelectedType] = useState<TemplateEditorValue["type"]>("Quote");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadTemplates(selectedType);
  }, [selectedType]);

  async function loadTemplates(type: TemplateEditorValue["type"]) {
    setTemplates(await apiClient.get<Template[]>(`/templates?type=${type}`));
  }

  async function saveTemplate(value: TemplateEditorValue) {
    await apiClient.post<Template>("/templates", value);
    setMessage("Template saved.");
    await loadTemplates(value.type);
  }

  async function deleteTemplate(id: number) {
    await apiClient.delete(`/templates/${id}`);
    setMessage("Template deleted.");
    await loadTemplates(selectedType);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Settings</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">Document templates</h1>
          </div>
          <select
            value={selectedType}
            onChange={event => setSelectedType(event.target.value as TemplateEditorValue["type"])}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
          >
            <option value="Quote">Quote</option>
            <option value="Invoice">Invoice</option>
            <option value="JobSheet">Job sheet</option>
            <option value="Certificate">Certificate</option>
          </select>
        </div>

        {message && <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {templates.map(template => (
            <article key={template.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-bold text-slate-950">{template.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{template.type} / {new Date(template.createdAtUtc).toLocaleDateString("en-GB")}</p>
              <button
                type="button"
                onClick={() => void deleteTemplate(template.id)}
                className="mt-4 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </article>
          ))}
        </section>

        <div className="mt-8">
          <TemplateEditor onSave={saveTemplate} value={{ name: `${selectedType} template`, type: selectedType, htmlTemplate: "" }} />
        </div>
      </div>
    </main>
  );
}
