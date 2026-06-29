import { Link } from "react-router-dom";

type QuickAction = {
    label: string;
    description: string;
    to: string;
};

const actions: QuickAction[] = [
    {
        label: "New Job",
        description: "Create and schedule a new job.",
        to: "/jobs",
    },
    {
        label: "Add Customer",
        description: "Create a new customer record.",
        to: "/customers",
    },
    {
        label: "Create Quote",
        description: "Prepare a quote for a customer.",
        to: "/quotes",
    },
    {
        label: "Open Calendar",
        description: "View the weekly dispatch planner.",
        to: "/calendar",
    },
];

function QuickActions() {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                    Quick Actions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Common tasks for managing your day.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {actions.map(action => (
                    <Link
                        key={action.to}
                        to={action.to}
                        className="rounded-lg border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                        <div className="text-sm font-semibold text-slate-900">
                            {action.label}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                            {action.description}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default QuickActions;