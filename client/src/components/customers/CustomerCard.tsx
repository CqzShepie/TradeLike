import { useState } from "react";
import { Link } from "react-router-dom";

import { Badge, Card, DangerButton, Modal, SecondaryButton } from "../ui";

import type { Customer } from "../../types/customer";

type CustomerCardProps = {
  customer: Customer;
  onDeleteCustomer?: (id: number) => void;
  onEditCustomer?: (customer: Customer) => void;
};

function CustomerCard({
  customer,
  onDeleteCustomer,
  onEditCustomer,
}: CustomerCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    if (!onDeleteCustomer) return;

    onDeleteCustomer(customer.id);
    setShowConfirm(false);
  }

  return (
    <Card as="article" tone="dark" className="h-full border-white/10 bg-slate-950/50 shadow-sm transition hover:border-blue-400/50 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Badge tone="blue">Customer #{customer.id}</Badge>

          <Link
            to={`/customers/${customer.id}`}
            className="mt-3 block text-lg font-bold text-white transition hover:text-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {customer.name}
          </Link>

          <div className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
            <p>
              <span className="font-semibold text-slate-100">Phone:</span>{" "}
              {customer.phone || "Not added"}
            </p>
            <p>
              <span className="font-semibold text-slate-100">Email:</span>{" "}
              {customer.email || "Not added"}
            </p>
            <p>
              <span className="font-semibold text-slate-100">Address:</span>{" "}
              {customer.address || "Not added"}
            </p>
            <p className="line-clamp-3">
              <span className="font-semibold text-slate-100">Notes:</span>{" "}
              {customer.notes?.trim() || "Nothing recorded yet."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <SecondaryButton
            type="button"
            size="sm"
            onClick={() => onEditCustomer?.(customer)}
          >
            Edit
          </SecondaryButton>

          {onDeleteCustomer && (
            <DangerButton
              type="button"
              size="sm"
              onClick={() => setShowConfirm(true)}
            >
              Delete
            </DangerButton>
          )}
        </div>
      </div>

      {showConfirm && (
        <Modal
          title="Delete customer?"
          onClose={() => setShowConfirm(false)}
        >
          <p className="text-sm leading-6 text-slate-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-950">{customer.name}</span>
            ?
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <SecondaryButton type="button" onClick={() => setShowConfirm(false)}>
              Cancel
            </SecondaryButton>
            <DangerButton type="button" onClick={handleDelete}>
              Delete
            </DangerButton>
          </div>
        </Modal>
      )}
    </Card>
  );
}

export default CustomerCard;
