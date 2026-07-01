import type { CSSProperties } from "react";

export interface OfflineSyncBannerProps {
  isOnline: boolean;
  pendingCount: number;
  conflictCount: number;
  isSyncing?: boolean;
  onSyncNow?: () => void;
  onReviewConflicts?: () => void;
}

export function OfflineSyncBanner({
  isOnline,
  pendingCount,
  conflictCount,
  isSyncing = false,
  onSyncNow,
  onReviewConflicts,
}: OfflineSyncBannerProps) {
  if (isOnline && pendingCount === 0 && conflictCount === 0) {
    return null;
  }

  const tone = conflictCount > 0 ? conflictTone : isOnline ? pendingTone : offlineTone;
  const title = conflictCount > 0
    ? "Sync needs review"
    : isOnline
      ? "Syncing changes"
      : "Offline mode";
  const detail = [
    pendingCount > 0 ? `${pendingCount} pending` : null,
    conflictCount > 0 ? `${conflictCount} conflicts` : null,
  ].filter(Boolean).join(" / ");

  return (
    <aside style={{ ...bannerStyle, ...tone }} role="status" aria-live="polite">
      <div style={copyStyle}>
        <strong style={titleStyle}>{title}</strong>
        <span style={detailStyle}>{detail || (isSyncing ? "Sync in progress" : "Waiting for connection")}</span>
      </div>

      {conflictCount > 0 && onReviewConflicts ? (
        <button type="button" style={actionStyle} onClick={onReviewConflicts}>
          Review
        </button>
      ) : null}

      {conflictCount === 0 && isOnline && pendingCount > 0 && onSyncNow ? (
        <button type="button" style={actionStyle} onClick={onSyncNow}>
          Sync
        </button>
      ) : null}
    </aside>
  );
}

const bannerStyle: CSSProperties = {
  alignItems: "center",
  borderRadius: 8,
  display: "flex",
  gap: 12,
  margin: "12px 0",
  padding: "12px 14px",
};

const conflictTone: CSSProperties = {
  background: "#fef3c7",
  border: "1px solid #f59e0b",
  color: "#78350f",
};

const pendingTone: CSSProperties = {
  background: "#dbeafe",
  border: "1px solid #2563eb",
  color: "#1e3a8a",
};

const offlineTone: CSSProperties = {
  background: "#e2e8f0",
  border: "1px solid #64748b",
  color: "#0f172a",
};

const copyStyle: CSSProperties = {
  display: "grid",
  flex: 1,
  gap: 2,
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  fontSize: 14,
};

const detailStyle: CSSProperties = {
  fontSize: 12,
};

const actionStyle: CSSProperties = {
  background: "#0f172a",
  border: 0,
  borderRadius: 6,
  color: "#ffffff",
  fontSize: 12,
  fontWeight: 800,
  padding: "8px 12px",
};
