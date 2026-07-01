import { useEffect, useState } from "react";
import { Building2, Plus, UserPlus } from "lucide-react";

import Sidebar from "../../../components/layout/Sidebar";
import { Button, InlineAlert, PageHeader, PageShell, PanelCard, SelectInput, TextInput } from "../../../components/ui";
import { apiClient } from "../../../services/apiClient";

type CompanyNode = {
  id: number;
  parentCompanyId: number | null;
  name: string;
  type: string;
  isActive: boolean;
  children: CompanyNode[];
};

export default function CompaniesPage() {
  const [tree, setTree] = useState<CompanyNode[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [branchName, setBranchName] = useState("");
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState("Staff");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadTree();
  }, []);

  async function loadTree() {
    try {
      setTree(await apiClient.get<CompanyNode[]>("/companies"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load companies.");
    }
  }

  async function createBranch() {
    if (branchName.trim().length === 0) return;
    setMessage("");
    setError("");

    try {
      await apiClient.post("/companies", {
        name: branchName,
        parentCompanyId: selectedCompanyId,
        type: "Branch",
      });
      setBranchName("");
      setMessage("Branch created.");
      await loadTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create branch.");
    }
  }

  async function inviteUser() {
    if (!selectedCompanyId || inviteUserId.trim().length === 0) return;
    setMessage("");
    setError("");

    try {
      await apiClient.post(`/companies/${selectedCompanyId}/users`, {
        userId: Number(inviteUserId),
        role: inviteRole,
      });
      setInviteUserId("");
      setMessage("User assigned to branch.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign user.");
    }
  }

  const flat = flatten(tree);

  return (
    <PageShell sidebar={<Sidebar />}>
      <PageHeader eyebrow="Admin" title="Companies & Branches" description="Manage branch hierarchy, branch roles and branch-level settings." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PanelCard title="Org tree">
          {message && <InlineAlert tone="success">{message}</InlineAlert>}
          {error && <InlineAlert tone="error">{error}</InlineAlert>}
          <div className="mt-5 space-y-2">
            {tree.length === 0 ? (
              <p className="text-sm text-slate-600">No branches yet.</p>
            ) : tree.map(node => (
              <CompanyTreeItem key={node.id} node={node} depth={0} selectedId={selectedCompanyId} onSelect={setSelectedCompanyId} />
            ))}
          </div>
        </PanelCard>

        <div className="space-y-6">
          <PanelCard title="Branch switcher">
            <SelectInput value={selectedCompanyId ?? ""} onChange={event => setSelectedCompanyId(Number(event.target.value) || null)}>
              <option value="">Tenant root</option>
              {flat.map(item => (
                <option key={item.id} value={item.id}>{`${"- ".repeat(item.depth)}${item.name}`}</option>
              ))}
            </SelectInput>
          </PanelCard>

          <PanelCard title="Create branch">
            <div className="space-y-4">
              <TextInput value={branchName} onChange={event => setBranchName(event.target.value)} placeholder="Branch name" />
              <Button onClick={createBranch}>
                <Plus className="mr-2 h-4 w-4" />
                Create branch
              </Button>
            </div>
          </PanelCard>

          <PanelCard title="Invite">
            <div className="space-y-4">
              <TextInput value={inviteUserId} onChange={event => setInviteUserId(event.target.value)} placeholder="User ID" />
              <SelectInput value={inviteRole} onChange={event => setInviteRole(event.target.value)}>
                <option value="Owner">Owner</option>
                <option value="Manager">Manager</option>
                <option value="Staff">Staff</option>
              </SelectInput>
              <Button onClick={inviteUser} disabled={!selectedCompanyId}>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign user
              </Button>
            </div>
          </PanelCard>
        </div>
      </div>
    </PageShell>
  );
}

function CompanyTreeItem({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: CompanyNode;
  depth: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${selectedId === node.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
        style={{ marginLeft: depth * 24 }}
      >
        <Building2 className="h-5 w-5 text-blue-700" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-950">{node.name}</span>
          <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{node.type}</span>
        </span>
      </button>
      {node.children.map(child => (
        <CompanyTreeItem key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

function flatten(nodes: CompanyNode[], depth = 0): Array<CompanyNode & { depth: number }> {
  return nodes.flatMap(node => [{ ...node, depth }, ...flatten(node.children, depth + 1)]);
}
