import { useEffect, useState } from "react";

import { apiClient } from "../../../services/apiClient";

type Permission = "Read" | "Write" | "Hidden";

interface RolePermission {
  roleName: string;
  entity: string;
  field: string;
  permission: Permission;
}

interface MatrixResponse {
  permissions: RolePermission[];
}

const options: Permission[] = ["Read", "Write", "Hidden"];

export default function PermissionsMatrixPage() {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiClient.get<MatrixResponse>("/permissions/matrix")
      .then(response => setPermissions(response.permissions))
      .catch(() => setPermissions(defaultRows));
  }, []);

  async function save() {
    const response = await apiClient.put<MatrixResponse>("/permissions/matrix", { permissions });
    setPermissions(response.permissions);
    setMessage("Permissions saved.");
  }

  function updatePermission(index: number, permission: Permission) {
    setPermissions(current => current.map((row, rowIndex) =>
      rowIndex === index ? { ...row, permission } : row));
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase text-blue-700">Settings</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Permissions Matrix</h1>
        {message ? <p className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{message}</p> : null}
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {permissions.map((row, index) => (
            <div key={`${row.roleName}-${row.entity}-${row.field}`} className="grid gap-3 border-b border-slate-200 p-4 last:border-b-0 md:grid-cols-[180px_160px_1fr_180px]">
              <strong>{row.roleName}</strong>
              <span>{row.entity}</span>
              <span>{row.field}</span>
              <select aria-label={`${row.roleName} ${row.entity} ${row.field}`} value={row.permission} onChange={event => updatePermission(index, event.target.value as Permission)} className="rounded-md border border-slate-300 px-3 py-2">
                {options.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          ))}
        </div>
        <button type="button" onClick={save} className="mt-6 rounded-md bg-blue-600 px-5 py-3 font-semibold text-white">Save matrix</button>
      </section>
    </main>
  );
}

const defaultRows: RolePermission[] = [
  { roleName: "CustomerEmployee", entity: "Jobs", field: "InternalNotes", permission: "Hidden" },
  { roleName: "CustomerManager", entity: "Quote", field: "MarginPence", permission: "Read" },
  { roleName: "CustomerDirector", entity: "*", field: "*", permission: "Write" },
];
