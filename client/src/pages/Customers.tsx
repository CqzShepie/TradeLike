import { useMemo, useState } from "react";
import { CreditCard, ListFilter, Plus, Search, Users } from "lucide-react";

import CustomerList from "../components/customers/CustomerList";
import NewCustomerForm from "../components/customers/NewCustomerForm";
import {
  Card,
  ErrorState,
  FormField,
  LoadingState,
  PageLayout,
  PrimaryButton,
  SecondaryButton,
  StatCard,
  TextInput,
} from "../components/ui";
import { useCustomers } from "../hooks/useCustomers";

function Customers() {
  const {
    customers,
    loading,
    error,
    reloadCustomers,
    addCustomer,
    deleteCustomer,
    updateCustomer,
  } = useCustomers();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter(customer =>
      [
        customer.name,
        customer.phone,
        customer.email,
        customer.address,
        customer.notes ?? "",
        String(customer.id),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [customers, search]);

  const stats = useMemo(
    () => [
      {
        title: "Total customers",
        value: customers.length,
        description: "records in the directory",
        icon: <Users className="h-5 w-5" />,
      },
      {
        title: "Visible records",
        value: filteredCustomers.length,
        description: "shown in the current list",
        icon: <ListFilter className="h-5 w-5" />,
      },
      {
        title: "Matching search",
        value: search.trim() ? filteredCustomers.length : customers.length,
        description: search.trim() ? "matching your search" : "all records",
        icon: <Search className="h-5 w-5" />,
      },
      {
        title: "Outstanding balances",
        value: "Not tracked",
        description: "available once invoices are linked",
        icon: <CreditCard className="h-5 w-5" />,
      },
    ],
    [customers.length, filteredCustomers.length, search]
  );

  const showCustomerForm = showForm;

  function handleAddCustomerClick() {
    if (showCustomerForm) {
      handleCloseForm();
      return;
    }

    openCustomerForm();
  }

  function openCustomerForm() {
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
  }

  return (
    <PageLayout className="bg-slate-950 text-slate-100" contentClassName="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
              Customer records
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Customers
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
              Manage customer records, contact details and job history.
            </p>
          </div>

          <PrimaryButton type="button" onClick={handleAddCustomerClick}>
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {showCustomerForm ? "Close form" : "Add customer"}
            </span>
          </PrimaryButton>
        </header>

        {loading && (
          <LoadingState
            title="Loading customers"
            description="Fetching the latest customer records and contact details."
          />
        )}

        {!loading && error && (
          <ErrorState
            title="Unable to load customers"
            description={error}
            action={
              <SecondaryButton type="button" onClick={reloadCustomers}>
                Try again
              </SecondaryButton>
            }
          />
        )}

        {!loading && !error && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(stat => (
                <StatCard
                  key={stat.title}
                  tone="dark"
                  title={stat.title}
                  value={String(stat.value)}
                  description={stat.description}
                  icon={stat.icon}
                />
              ))}
            </section>

            <div className={showCustomerForm ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]" : "space-y-6"}>
              <Card tone="dark" padding="lg" className="border-slate-800">
                <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
                      Directory
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-white">
                      Customer list
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Search by name, phone, email, address or notes.
                    </p>
                  </div>

                  <div className="w-full max-w-md">
                    <FormField label="Search customers" htmlFor="customer-search">
                      <TextInput
                        id="customer-search"
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="Search name, phone, email, address or notes"
                        className="placeholder:text-slate-400"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="mt-6">
                  <CustomerList
                    customers={filteredCustomers}
                    onDeleteCustomer={deleteCustomer}
                    emptyTitle={customers.length === 0 ? "Add your first customer" : "No customers found"}
                    emptyDescription={customers.length === 0 ? "Create a customer record to start building your directory." : "Try widening your search or add a new customer record."}
                    emptyAction={customers.length === 0 ? (
                      <PrimaryButton type="button" onClick={openCustomerForm}>
                        <span className="inline-flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add customer
                        </span>
                      </PrimaryButton>
                    ) : null}
                  />
                </div>
              </Card>

              {showCustomerForm ? (
                <NewCustomerForm
                  onAddCustomer={async customer => {
                    await addCustomer(customer);
                    setShowForm(false);
                  }}
                  onUpdateCustomer={async customer => {
                    await updateCustomer(customer);
                    setShowForm(false);
                  }}
                  editingCustomer={null}
                  onCancelEdit={handleCloseForm}
                />
              ) : null}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}

export default Customers;
