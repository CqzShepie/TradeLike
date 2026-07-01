type AccountingProviderCardProps = {
  provider: string;
  connected: boolean;
  lastSyncAtUtc?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
};

export default function AccountingProviderCard({
  provider,
  connected,
  lastSyncAtUtc,
  onConnect,
  onDisconnect,
}: AccountingProviderCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{provider}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Last sync: {lastSyncAtUtc ? new Date(lastSyncAtUtc).toLocaleString("en-GB") : "Not synced"}
          </p>
        </div>
        <span className={connected ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"}>
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" defaultChecked={connected} />
        Auto-sync nightly
      </label>
      <button
        type="button"
        onClick={connected ? onDisconnect : onConnect}
        className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600"
      >
        {connected ? "Disconnect" : "Connect"}
      </button>
    </article>
  );
}
