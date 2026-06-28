import { useState } from "react";
import type { Customer } from "../../types/customer";
import Modal from "../ui/Modal";

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
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {customer.name}
          </h3>

          <p className="mt-1 text-slate-600">
            📞 {customer.phone}
          </p>

          <p className="mt-1 text-slate-600">
            ✉️ {customer.email}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            📍 {customer.address}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEditCustomer?.(customer)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Edit
          </button>

          {onDeleteCustomer && (
            <button
              onClick={() => setShowConfirm(true)}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {showConfirm && (
        <Modal
          title="Confirm Delete"
          onClose={() => setShowConfirm(false)}
        >
          <p className="mb-6 text-slate-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{customer.name}</span>?
          </p>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Cancel
            </button>

            <button
              onClick={handleDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CustomerCard;