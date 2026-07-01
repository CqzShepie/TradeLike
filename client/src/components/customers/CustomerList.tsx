import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import CustomerCard from "./CustomerCard";
import { Badge, DangerButton, EmptyState, SecondaryButton, TableShell } from "../ui";

import type { Customer } from "../../types/customer";

interface CustomerListProps {
  customers: Customer[];
  onDeleteCustomer: (id: number) => void;
  onEditCustomer: (customer: Customer) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

export default function CustomerList({
  customers,
  onDeleteCustomer,
  onEditCustomer,
  emptyTitle = "No customers found",
  emptyDescription = "Try widening your search or add a new customer record to get started.",
  emptyAction,
}: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:hidden">
        {customers.map(customer => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            onDeleteCustomer={onDeleteCustomer}
            onEditCustomer={onEditCustomer}
          />
        ))}
      </div>

      <TableShell className="hidden md:block">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/[0.03]">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Customer
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Contact
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Address
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Notes
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-slate-950/30">
            {customers.map(customer => (
              <tr key={customer.id} className="transition hover:bg-white/[0.03]">
                <td className="px-5 py-4 align-top">
                  <Link
                    to={`/customers/${customer.id}`}
                    className="block font-semibold text-white transition hover:text-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    {customer.name}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">
                    Customer #{customer.id}
                  </p>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="space-y-2 text-sm leading-6 text-slate-300">
                    <p>{customer.phone || "No phone"}</p>
                    <p>{customer.email || "No email"}</p>
                  </div>
                </td>
                <td className="px-5 py-4 align-top text-sm leading-6 text-slate-300">
                  {customer.address || "No address"}
                </td>
                <td className="px-5 py-4 align-top">
                  {customer.notes?.trim() && (
                    <Badge tone="green">
                      Has notes
                    </Badge>
                  )}
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">
                    {customer.notes?.trim() || "Nothing recorded yet."}
                  </p>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex justify-end gap-2">
                    <SecondaryButton
                      type="button"
                      size="sm"
                      onClick={() => onEditCustomer(customer)}
                    >
                      Edit
                    </SecondaryButton>
                    <DangerButton
                      type="button"
                      size="sm"
                      onClick={() => onDeleteCustomer(customer.id)}
                    >
                      Delete
                    </DangerButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
