import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <aside className="w-64 border-r border-slate-200 bg-white p-6">
      <h2 className="mb-8 text-2xl font-bold text-blue-600">
        TradeLike
      </h2>

      <nav className="flex flex-col gap-2">
        <Link
          to="/dashboard"
          className="rounded-lg px-4 py-3 hover:bg-slate-100"
        >
          Dashboard
        </Link>

        <Link
          to="/jobs"
          className="rounded-lg px-4 py-3 hover:bg-slate-100"
        >
          Jobs
        </Link>

        <Link
          to="/customers"
          className="rounded-lg px-4 py-3 hover:bg-slate-100"
        >
          Customers
        </Link>

        <Link
          to="/calendar"
          className="rounded-lg px-4 py-3 hover:bg-slate-100"
        >
          Calendar
        </Link>

        <Link
          to="/quotes"
          className="rounded-lg px-4 py-3 hover:bg-slate-100"
        >
          Quotes
        </Link>

        <Link
          to="/invoices"
          className="rounded-lg px-4 py-3 hover:bg-slate-100"
        >
          Invoices
        </Link>

        <Link
          to="/settings"
          className="rounded-lg px-4 py-3 hover:bg-slate-100"
        >
          Settings
        </Link>
      </nav>
    </aside>
  );
}

export default Sidebar;