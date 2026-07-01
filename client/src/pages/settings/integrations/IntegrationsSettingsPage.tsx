import { useEffect, useState } from "react";

import AccountingProviderCard from "../../../components/integrations/AccountingProviderCard";
import { apiClient } from "../../../services/apiClient";

type IntegrationStatus = {
  provider: string;
  connected: boolean;
  lastSyncAtUtc?: string | null;
};

type ConnectResponse = {
  authorizationUrl: string;
};

export default function IntegrationsSettingsPage() {
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus() {
    setStatuses(await apiClient.get<IntegrationStatus[]>("/integrations/status"));
  }

  async function connect(provider: string) {
    const response = await apiClient.get<ConnectResponse>(`/integrations/${provider}/connect`);
    setMessage(`Open accounting authorization: ${response.authorizationUrl}`);
  }

  async function disconnect(provider: string) {
    await apiClient.post(`/integrations/${provider}/disconnect`, {});
    await loadStatus();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Settings</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Accounting integrations</h1>
        {message && <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</p>}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {statuses.map(status => (
            <AccountingProviderCard
              key={status.provider}
              provider={status.provider}
              connected={status.connected}
              lastSyncAtUtc={status.lastSyncAtUtc}
              onConnect={() => void connect(status.provider)}
              onDisconnect={() => void disconnect(status.provider)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
