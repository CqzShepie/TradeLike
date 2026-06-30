import type { AdminUser } from "../../types/admin";
import { permanentDirectorEmail } from "./adminPortalConstants";

export default function StaffCloseAccountAction({
  staff,
  saving,
  canUse,
  onClose,
}: {
  staff: AdminUser;
  saving: boolean;
  canUse: boolean;
  onClose: (staff: AdminUser) => void;
}) {
  if (!canUse || staff.email.toLowerCase() === permanentDirectorEmail) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => onClose(staff)}
      disabled={saving}
      className="rounded-lg border border-red-500/70 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Remove staff account
    </button>
  );
}
