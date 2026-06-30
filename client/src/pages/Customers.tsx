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
    const { customers, loading, editingCustomer, addCustomer, deleteCustomer, updateCustomer, startEdit, cancelEdit } = useCustomers();
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);

    const filteredCustomers = customers.filter(customer => {
        const query = search.toLowerCase();
        return customer.name.toLowerCase().includes(query) || customer.phone.toLowerCase().includes(query) || customer.email.toLowerCase().includes(query) || customer.address.toLowerCase().includes(query) || String(customer.id).includes(query);
    });

    const stats = [
        { title: "Total Clients", value: customers.length },
        { title: "Has Email", value: customers.filter(customer => customer.email.trim() !== "").length },
        { title: "Has Phone Number", value: customers.filter(customer => customer.phone.trim() !== "").length },
    ];

    return (
        <main className="flex min-h-screen bg-slate-50">
            <Sidebar />
            <section className="flex-1 p-10">
                <SectionHeader title="Clients" subtitle="View clients, contact details, important information, and service history." />
                {loading ? <p className="text-slate-500">Loading clients...</p> : <>
                    <StatsGrid stats={stats} />
                    {editingCustomer && <p className="mb-4 text-sm font-medium text-blue-600">Editing: {editingCustomer.name}</p>}
                    <div className="mb-8"><Button onClick={() => { if (editingCustomer) cancelEdit(); setShowForm(previous => !previous); }}>{showForm || editingCustomer ? "Close Form" : "+ New Client"}</Button></div>
                    {(showForm || editingCustomer) && <NewCustomerForm onAddCustomer={async customer => { await addCustomer(customer); setShowForm(false); }} onUpdateCustomer={async customer => { await updateCustomer(customer); setShowForm(false); }} editingCustomer={editingCustomer} onCancelEdit={() => { cancelEdit(); setShowForm(false); }} />}
                    <div className="my-8"><Input type="text" placeholder="🔍 Search ID, client, phone, email or address..." value={search} onChange={event => setSearch(event.target.value)} /></div>
                    <CustomerList customers={filteredCustomers} onDeleteCustomer={deleteCustomer} onEditCustomer={customer => { startEdit(customer); setShowForm(true); }} />
                </>}
            </section>
        </main>
    );
}

export default Customers;
