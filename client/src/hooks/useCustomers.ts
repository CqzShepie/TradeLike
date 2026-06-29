import { useEffect, useState } from "react";
import { toast } from "sonner";

import { customersService } from "../services/customersService";

import type { Customer } from "../types/customer";
import type { NewCustomer } from "../types/newCustomer";

export function useCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    async function loadCustomers() {
        try {
            setLoading(true);

            const data = await customersService.getAll();

            setCustomers(data);
        } catch (err) {
            console.error("Failed to load customers:", err);
            toast.error("Failed to load customers.");
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCustomers();
    }, []);

    async function addCustomer(newCustomer: NewCustomer) {
        try {
            await customersService.create(newCustomer);
            await loadCustomers();

            toast.success("Customer created successfully!");
        } catch (err) {
            console.error("Failed to add customer:", err);
            toast.error("Failed to create customer.");
        }
    }

    async function deleteCustomer(id: number) {
        try {
            await customersService.delete(id);
            await loadCustomers();

            if (editingCustomer?.id === id) {
                setEditingCustomer(null);
            }

            toast.success("Customer deleted successfully!");
        } catch (err) {
            console.error("Failed to delete customer:", err);
            toast.error("Failed to delete customer.");
        }
    }

    async function updateCustomer(updatedCustomer: Customer) {
        try {
            await customersService.update(updatedCustomer);
            await loadCustomers();

            setEditingCustomer(null);

            toast.success("Customer updated successfully!");
        } catch (err) {
            console.error("Failed to update customer:", err);
            toast.error("Failed to update customer.");
        }
    }

    function startEdit(customer: Customer) {
        setEditingCustomer(customer);
    }

    function cancelEdit() {
        setEditingCustomer(null);
    }

    return {
        customers,
        loading,
        addCustomer,
        deleteCustomer,
        updateCustomer,
        editingCustomer,
        startEdit,
        cancelEdit,
        reloadCustomers: loadCustomers,
    };
}