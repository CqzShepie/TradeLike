import { useEffect, useState } from "react";
import { BarChart3, Briefcase, CalendarDays, Code2, FileText, LayoutDashboard, Package, Palette, Search, Settings2, UploadCloud, Users, UserCog, Umbrella } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import Logo from "./Logo";
import { useGlobalSearch } from "../../contexts/useGlobalSearch";
import { useAuth } from "../../hooks/useAuth";

function Sidebar() {
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const navigate = useNavigate();
  const { isDirector, isManagerOrDirector } = useAuth();
  const search = useGlobalSearch();

  useEffect(() => {
    document.body.classList.add("bg-slate-950");
    return () => {
      document.body.classList.remove("bg-slate-950");
    };
  }, []);

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/customers", label: "Customers", icon: Users },
    { to: "/jobs", label: "Jobs", icon: Briefcase },
    { to: "/quotes", label: "Quotes", icon: FileText },
    { to: "/calendar", label: "Calendar", icon: CalendarDays },
    ...(isManagerOrDirector
      ? [
          { to: "/team", label: "Team", icon: UserCog },
          { to: "/leave", label: "Leave", icon: Umbrella },
          { to: "/reports", label: "Reports", icon: BarChart3 },
          { to: "/reports/overview", label: "Analytics", icon: BarChart3 },
          { to: "/inventory", label: "Inventory", icon: Package },
        ]
      : []),
    ...(isDirector
      ? [
          { to: "/settings/api", label: "API", icon: Code2 },
          { to: "/settings/branding", label: "Branding", icon: Palette },
          { to: "/settings/import-export", label: "Import / Export", icon: UploadCloud },
        ]
      : []),
    { to: "/settings", label: "Settings", icon: Settings2 },
  ];

  function goToHomeScreen() {
    setShowHomeConfirm(false);
    navigate("/");
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-slate-950 px-5 py-6 text-slate-100 shadow-2xl shadow-slate-950/40">
        <Logo tone="dark" onClick={() => setShowHomeConfirm(true)} className="mb-8" />

        <button
          type="button"
          onClick={search.open}
          className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:border-white/15 hover:bg-slate-800 hover:text-white"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950 text-blue-300">
            <Search className="h-5 w-5" />
          </span>
          <span>Search</span>
        </button>

        <nav className="flex flex-col gap-2">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "border-blue-500/40 bg-blue-500/15 text-white shadow-sm shadow-blue-950/30"
                    : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      "flex h-10 w-10 items-center justify-center rounded-xl border transition",
                      isActive
                        ? "border-blue-500/30 bg-blue-500/20 text-blue-300"
                        : "border-white/10 bg-slate-900 text-slate-300 group-hover:border-white/15 group-hover:bg-slate-800 group-hover:text-white",
                    ].join(" ")}
                  >
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="h-0 w-72 shrink-0" aria-hidden="true" />

      {showHomeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/60">
            <h2 className="text-lg font-bold text-white">Go to home screen?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              This will take you back to the TradeLike home page. Your account will stay signed in.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowHomeConfirm(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
              >
                Stay here
              </button>
              <button
                type="button"
                onClick={goToHomeScreen}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
