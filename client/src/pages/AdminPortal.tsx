import { useEffect } from "react";
import AdminPortalInvite from "./admin/AdminPortalInvite";

export default function AdminPortal() {
  useEffect(() => {
    const headerRole = document.querySelector("main > header p") as HTMLParagraphElement | null;
    const greeting = document.querySelector("main section h1") as HTMLHeadingElement | null;

    if (!headerRole || !greeting || greeting.parentElement?.querySelector("[data-admin-role]") || headerRole.textContent?.trim() === "") {
      return;
    }

    const movedRole = document.createElement("p");
    movedRole.dataset.adminRole = "true";
    movedRole.textContent = headerRole.textContent;
    movedRole.className = "mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500";
    greeting.insertAdjacentElement("afterend", movedRole);
    headerRole.remove();
  }, []);

  return <AdminPortalInvite />;
}
