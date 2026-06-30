import type { ReactNode } from "react";
import { authService } from "../../services/authService";
import type { AdminAuditLog, AdminUser } from "../../types/admin";
import { permissionDefinitions } from "./adminPortalConstants";
import {
  formatDateTime,
  formatStatus,
  summarisePermissions,
} from "./adminPortalHelpers";
import type { PermissionFlags, PermissionKey } from "./adminPortalTypes";

export function StaffList({
  title,
  subtitle,
  users,
  selectedStaff,
  loading,
  onSelect,
  onHeaderClick,
  onAuditClick,
  emptyText,
}: {
  title: string;
  subtitle: string;
  users: AdminUser[];
  selectedStaff: AdminUser | null;
  loading: boolean;
  onSelect: (user: AdminUser) => void;
  onHeaderClick: () => void;
  onAuditClick: (user: AdminUser) => void;
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
      <button
        type="button"
        onClick={onHeaderClick}
        className="w-full border-b border-slate-800 px-5 py-4 text-left hover:bg-slate-800/60"
      >
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </button>

      {loading ? (
        <div className="p-5 text-sm text-slate-400">Loading...</div>
      ) : users.length === 0 ? (
        <div className="p-5 text-sm text-slate-400">{emptyText}</div>
      ) : (
        <div className="max-h-[360px] divide-y divide-slate-800 overflow-y-auto">
          {users.map(user => (
            <div
              key={user.id}
              className={`grid gap-3 px-5 py-4 hover:bg-slate-800 md:grid-cols-[1fr_120px_120px_180px_100px] ${
                selectedStaff?.id === user.id ? "bg-slate-800" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(user)}
                className="text-left"
              >
                <p className="font-semibold text-white">
                  {user.fullName || user.email}
                </p>

                <p className="mt-1 text-sm text-slate-400">{user.email}</p>

                {user.role === "Personal Assistant" &&
                  user.personalAssistantTo && (
                    <p className="mt-1 text-xs text-blue-300">
                      PA to {user.personalAssistantTo}
                    </p>
                  )}
              </button>

              <Badge>{user.role}</Badge>
              <Badge>{formatStatus(user.accountStatus)}</Badge>
              <Badge>{summarisePermissions(user)}</Badge>

              <button
                type="button"
                onClick={() => onAuditClick(user)}
                className="rounded-lg border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Logs
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PermissionEditor({
  title,
  permissions,
  setPermissions,
  disabled = false,
}: {
  title: string;
  permissions: PermissionFlags;
  setPermissions: (value: PermissionFlags) => void;
  disabled?: boolean;
}) {
  const groups = Array.from(
    new Set(permissionDefinitions.map(permission => permission.group))
  );

  function setPermission(key: PermissionKey, value: boolean) {
    setPermissions({
      ...permissions,
      [key]: value,
    });
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>

      <div className="mt-4 max-h-[320px] space-y-5 overflow-y-auto pr-2">
        {groups.map(group => (
          <div key={group}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group}
            </p>

            <div className="grid gap-2">
              {permissionDefinitions
                .filter(permission => permission.group === group)
                .map(permission => (
                  <PermissionCheckbox
                    key={permission.key}
                    checked={permissions[permission.key]}
                    disabled={disabled}
                    onChange={value => setPermission(permission.key, value)}
                    label={permission.label}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuditLogRow({ log }: { log: AdminAuditLog }) {
  return (
    <div className="px-5 py-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-semibold text-white">{log.summary}</p>

          <p className="mt-1 text-sm text-slate-400">
            By{" "}
            <span className="font-semibold text-slate-200">
              {log.actorName || log.actorEmail}
            </span>{" "}
            ({log.actorRole})
          </p>

          {log.targetEmail && (
            <p className="mt-1 text-sm text-slate-400">
              Target: {log.targetEmail}
            </p>
          )}

          {log.details && (
            <p className="mt-2 rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-300">
              {log.details}
            </p>
          )}
        </div>

        <div className="text-left md:text-right">
          <Badge>{log.action}</Badge>

          <p className="mt-2 text-xs text-slate-500">
            {formatDateTime(log.createdAt)}
          </p>

          {log.ipAddress && (
            <p className="mt-1 text-xs text-slate-600">
              IP: {log.ipAddress}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminNavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const currentUser = authService.getUser();

  if (children === "Overview" && currentUser?.role !== "Director") {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-left text-sm font-semibold ${
        active
          ? "bg-blue-600 text-white"
          : "text-slate-300 hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}

export function SnapshotRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-fit w-fit items-center rounded-full bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300">
      {children}
    </span>
  );
}

function PermissionCheckbox({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export function DarkInput({
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
  step,
  disabled = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  max?: string | number;
  step?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      value={value}
      type={type}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      onChange={event => onChange(event.target.value)}
      className={`w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 disabled:bg-slate-800 disabled:text-slate-500 ${className}`}
    />
  );
}

export function DarkSelect({
  value,
  onChange,
  children,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={event => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
    >
      {children}
    </select>
  );
}

export function DarkTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={event => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
    />
  );
}
