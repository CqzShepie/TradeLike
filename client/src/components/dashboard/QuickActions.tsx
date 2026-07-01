import { Link } from "react-router-dom";
import { Card, SectionHeader } from "../ui";

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
        <Card as="section" padding="md">
            <SectionHeader
                title="Quick actions"
                subtitle="Common tasks for managing your day."
                className="mb-5"
            />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {actions.map(action => (
                    <Link
                        key={action.to}
                        to={action.to}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    >
                        <div className="text-sm font-bold text-slate-950">
                            {action.label}
                        </div>

                        <div className="mt-2 text-xs leading-5 text-slate-500">
                            {action.description}
                        </div>
                    </Link>
                ))}
            </div>
        </Card>
    );
}

export default QuickActions;
