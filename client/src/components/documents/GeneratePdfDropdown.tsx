import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";

import { apiClient } from "../../services/apiClient";

type Template = {
  id: number;
  name: string;
  type: string;
};

type GeneratePdfDropdownProps = {
  entityType: "Quote" | "Invoice" | "Job" | "Certificate";
  entityId: number;
};

export default function GeneratePdfDropdown({ entityType, entityId }: GeneratePdfDropdownProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const templateType = entityType === "Job" ? "JobSheet" : entityType;
    apiClient
      .get<Template[]>(`/templates?type=${templateType}`)
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, [entityType]);

  async function generate(templateId: string) {
    if (!templateId) return;
    const response = await apiClient.post<{ documentId: number }>("/documents/generate", {
      entityType,
      entityId,
      templateId: Number(templateId),
    });
    setMessage(`PDF queued. Document #${response.documentId}`);
  }

  return (
    <div className="inline-flex items-center gap-2">
      <FileDown className="h-4 w-4 text-blue-700" />
      <select
        aria-label="Generate PDF"
        onChange={event => void generate(event.target.value)}
        className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 outline-none hover:bg-blue-50"
        defaultValue=""
      >
        <option value="">Generate PDF</option>
        {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
      </select>
      {message && <span className="text-xs font-semibold text-emerald-700">{message}</span>}
    </div>
  );
}
