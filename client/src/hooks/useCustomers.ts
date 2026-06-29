import { useEffect, useState } from "react";
import { toast } from "sonner";

import { customerService } from "../services/customerService";

import type { Customer } from "../types/customer";
import type { NewCustomer } from "../types/newCustomer";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // LOAD CUSTOMERS
  useEffect(() => {
    async function loadCustomers() {
      try {
        const data = await customerService.getAll();
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

  // ADD CUSTOMER
  async function addCustomer(newCustomer: NewCustomer) {
    try {
      const created = await customerService.create(newCustomer);

      setCustomers((prev) => [...prev, created]);

      toast.success("Customer created successfully!");
    } catch (err) {
      console.error("Failed to add customer:", err);
      toast.error("Failed to create customer.");
    }
  }

  // DELETE CUSTOMER
  async function deleteCustomer(id: number) {
    try {
      await customerService.delete(id);

      setCustomers((prev) =>
        prev.filter((customer) => customer.id !== id)
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

  // UPDATE CUSTOMER
  async function updateCustomer(updatedCustomer: Customer) {
    try {
      const updated = await customerService.update(updatedCustomer);

      setCustomers((prev) =>
        prev.map((customer) =>
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

  // START EDIT
  function startEdit(customer: Customer) {
    setEditingCustomer(customer);
  }

  // CANCEL EDIT
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