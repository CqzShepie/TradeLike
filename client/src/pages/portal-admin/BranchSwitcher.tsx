import { useEffect, useState } from "react";
import { Building2, Check } from "lucide-react";

import { apiClient } from "../../services/apiClient";

type Branch = {
  id: number;
  name: string;
  isDefault: boolean;
  isActive: boolean;
};

const branchStorageKey = "tradelike_branch_id";

export default function BranchSwitcher() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(() => {
    const stored = localStorage.getItem(branchStorageKey);
    return stored ? Number(stored) : null;
  });
  const [newBranchName, setNewBranchName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadBranches();
  }, []);

  async function loadBranches() {
    try {
      setBranches(await apiClient.get<Branch[]>("/companies/branches"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Branches could not be loaded.");
    }
  }

  async function createBranch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiClient.post<Branch>("/companies/branches", { name: newBranchName, isDefault: branches.length === 0 });
    setNewBranchName("");
    await loadBranches();
  }

  async function switchBranch(branchId: number | null) {
    setSelectedBranchId(branchId);
    if (branchId) {
      localStorage.setItem(branchStorageKey, String(branchId));
    } else {
      localStorage.removeItem(branchStorageKey);
    }
    await apiClient.post("/companies/branches/switch", { branchId });
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-blue-700" />
        <h2 className="text-lg font-bold text-slate-950">Company branches</h2>
      </div>
      {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={() => void switchBranch(null)}
          className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          All branches
          {selectedBranchId === null && <Check className="h-4 w-4 text-emerald-600" />}
        </button>
        {branches.map(branch => (
          <button
            key={branch.id}
            type="button"
            onClick={() => void switchBranch(branch.id)}
            className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <span>{branch.name}{branch.isDefault ? " · default" : ""}</span>
            {selectedBranchId === branch.id && <Check className="h-4 w-4 text-emerald-600" />}
          </button>
        ))}
      </div>
      <form onSubmit={createBranch} className="mt-4 flex gap-2">
        <input
          value={newBranchName}
          onChange={event => setNewBranchName(event.target.value)}
          placeholder="New branch"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
        <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600">Add</button>
      </form>
    </section>
  );
}
