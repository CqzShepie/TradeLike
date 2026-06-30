import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { terminologyService } from "../../services/terminologyService";

function Sidebar() {
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [customerLabel, setCustomerLabel] = useState(() => terminologyService.getCustomerLabel());
  const navigate = useNavigate();

  useEffect(() => terminologyService.subscribe(() => setCustomerLabel(terminologyService.getCustomerLabel())), []);

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-4 py-3 transition-colors ${isActive ? "bg-blue-100 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-100"}`;

  function goToHomeScreen() {
    setShowHomeConfirm(false);
    navigate("/");
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-slate-200 bg-white p-6">
        <button type="button" onClick={() => setShowHomeConfirm(true)} className="mb-8 text-left text-2xl font-bold text-blue-600 hover:text-blue-700">TradeLike</button>
        <nav className="flex flex-col gap-2">
          <NavLink to="/dashboard" className={linkClasses}>Dashboard</NavLink>
          <NavLink to="/jobs" className={linkClasses}>Jobs</NavLink>
          <NavLink to="/customers" className={linkClasses}>{customerLabel}</NavLink>
          <NavLink to="/calendar" className={linkClasses}>Calendar</NavLink>
          <NavLink to="/team" className={linkClasses}>Staff & Teams</NavLink>
          <NavLink to="/quotes" className={linkClasses}>Quotes</NavLink>
          <NavLink to="/invoices" className={linkClasses}>Invoices</NavLink>
          <NavLink to="/settings" className={linkClasses}>Settings</NavLink>
        </nav>
      </aside>
      <div className="h-0 w-64 shrink-0" aria-hidden="true" />
      {showHomeConfirm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><h2 className="text-lg font-bold text-slate-900">Go to home screen?</h2><p className="mt-2 text-sm leading-6 text-slate-600">This will take you back to the TradeLike home page. Your account will stay signed in.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowHomeConfirm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Stay Here</button><button type="button" onClick={goToHomeScreen} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Go Home</button></div></div></div>}
    </>
  );
}

export default Sidebar;
