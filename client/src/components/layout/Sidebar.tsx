import { NavLink } from "react-router-dom";

function Sidebar() {
    const linkClasses = ({ isActive }: { isActive: boolean }) =>
        `rounded-lg px-4 py-3 transition-colors ${
            isActive
                ? "bg-blue-100 text-blue-700 font-medium"
                : "text-slate-700 hover:bg-slate-100"
        }`;

    return (
        <aside className="w-64 border-r border-slate-200 bg-white p-6">
            <h2 className="mb-8 text-2xl font-bold text-blue-600">
                TradeLike
            </h2>

            <nav className="flex flex-col gap-2">
                <NavLink to="/dashboard" className={linkClasses}>
                    Dashboard
                </NavLink>

                <NavLink to="/jobs" className={linkClasses}>
                    Jobs
                </NavLink>

                <NavLink to="/customers" className={linkClasses}>
                    Customers
                </NavLink>

                <NavLink to="/calendar" className={linkClasses}>
                    Calendar
                </NavLink>

                <NavLink to="/quotes" className={linkClasses}>
                    Quotes
                </NavLink>

                <NavLink to="/invoices" className={linkClasses}>
                    Invoices
                </NavLink>

                <NavLink to="/settings" className={linkClasses}>
                    Settings
                </NavLink>
            </nav>
        </aside>
    );
}

export default Sidebar;