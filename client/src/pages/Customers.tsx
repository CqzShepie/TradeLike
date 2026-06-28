import { useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import SectionHeader from "../components/ui/SectionHeader";
import StatsGrid from "../components/ui/StatsGrid";
import CustomerList from "../components/customers/CustomerList";
import NewCustomerForm from "../components/customers/NewCustomerForm";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

import { useCustomers } from "../hooks/useCustomers";

function Customers() {
  const {
    customers,
    loading,
    editingCustomer,
    addCustomer,
    deleteCustomer,
    updateCustomer,
    startEdit,
    cancelEdit,
  } = useCustomers();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filteredCustomers = customers.filter((customer) => {
    const query = search.toLowerCase();

    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.address.toLowerCase().includes(query)
    );
  });

  const stats = [
    {
      title: "Total Customers",
      value: customers.length,
    },
    {
      title: "With Email",
      value: customers.filter((c) => c.email.trim() !== "").length,
    },
    {
      title: "With Phone",
      value: customers.filter((c) => c.phone.trim() !== "").length,
    },
  ];

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <section className="flex-1 p-10">
        <SectionHeader
          title="Customers"
          subtitle="View and manage all your customers."
        />

        {loading ? (
          <p className="text-slate-500">Loading customers...</p>
        ) : (
          <>
            <StatsGrid stats={stats} />

            {editingCustomer && (
              <p className="mb-4 text-sm text-blue-600">
                Editing: {editingCustomer.name}
              </p>
            )}

            <div className="mb-8">
              <Button onClick={() => setShowForm((prev) => !prev)}>
                {showForm ? "Close Form" : "+ New Customer"}
              </Button>
            </div>

            {(showForm || editingCustomer) && (
              <NewCustomerForm
                onAddCustomer={addCustomer}
                onUpdateCustomer={updateCustomer}
                editingCustomer={editingCustomer}
                onCancelEdit={() => {
                  cancelEdit();
                  setShowForm(false);
                }}
              />
            )}

            <div className="my-8">
              <Input
                type="text"
                placeholder="🔍 Search customer, phone, email or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <CustomerList
              customers={filteredCustomers}
              onDeleteCustomer={deleteCustomer}
              onEditCustomer={(customer) => {
                startEdit(customer);
                setShowForm(true);
              }}
            />

            {filteredCustomers.length === 0 && (
              <p className="mt-8 text-center text-slate-500">
                No matching customers found.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default Customers;