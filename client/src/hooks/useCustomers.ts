import { useEffect, useState } from "react";
import { toast } from "sonner";

import { customersService } from "../services/customersService";

import type { Customer } from "../types/customer";
import type { NewCustomer } from "../types/newCustomer";

export function useCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    useEffect(() => {
        async function loadCustomers() {
            try {
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

        loadCustomers();
    }, []);

    async function addCustomer(newCustomer: NewCustomer) {
        try {
            const created = await customersService.create(newCustomer);

            setCustomers(previous => [...previous, created]);

            toast.success("Customer created successfully!");
        } catch (err) {
            console.error("Failed to add customer:", err);
            toast.error("Failed to create customer.");
        }
    }

    async function deleteCustomer(id: number) {
        try {
            await customersService.delete(id);

            setCustomers(previous =>
                previous.filter(customer => customer.id !== id)
            );

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
            const updated = await customersService.update(updatedCustomer);

            setCustomers(previous =>
                previous.map(customer =>
                    customer.id === updated.id ? updated : customer
                )
            );

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
    };
}