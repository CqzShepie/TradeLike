import { Link } from "react-router-dom";
import type { Customer } from "../../types/customer";

interface CustomerListProps {
    customers: Customer[];
    onDeleteCustomer: (id: number) => void;
    onEditCustomer: (customer: Customer) => void;
}

export default function CustomerList({
    customers,
    onDeleteCustomer,
    onEditCustomer,
}: CustomerListProps) {
    if (customers.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                No customers found.
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {customers.map(customer => (
                <article
                    key={customer.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                    <Link to={`/customers/${customer.id}`} className="block">
                        <div className="mb-3 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                                    Customer #{customer.id}
                                </p>

                                <h3 className="mt-1 text-lg font-bold text-slate-900">
                                    {customer.name}
                                </h3>
                            </div>

                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                View
                            </span>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600">
                            <p>
                                <span className="font-medium text-slate-800">Phone:</span>{" "}
                                {customer.phone || "Not added"}
                            </p>

                            <p>
                                <span className="font-medium text-slate-800">Email:</span>{" "}
                                {customer.email || "Not added"}
                            </p>

                            <p>
                                <span className="font-medium text-slate-800">Address:</span>{" "}
                                {customer.address || "Not added"}
                            </p>
                        </div>

                        {customer.notes && (
                            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                                {customer.notes}
                            </div>
                        )}
                    </Link>

                    <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            onClick={() => onEditCustomer(customer)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            onClick={() => onDeleteCustomer(customer.id)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                            Delete
                        </button>
                    </div>
                </article>
            ))}
        </div>
    );
}