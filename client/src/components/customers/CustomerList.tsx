import type { Customer } from "../../types/customer";
import CustomerCard from "./CustomerCard";

type CustomerListProps = {
  customers: Customer[];
  onDeleteCustomer?: (id: number) => void;
  onEditCustomer?: (customer: Customer) => void;
};

function CustomerList({
  customers,
  onDeleteCustomer,
  onEditCustomer,
}: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        No customers found.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {customers.map((customer) => (
        <CustomerCard
          key={customer.id}
          customer={customer}
          onDeleteCustomer={onDeleteCustomer}
          onEditCustomer={onEditCustomer}
        />
      ))}
    </div>
  );
}

export default CustomerList;