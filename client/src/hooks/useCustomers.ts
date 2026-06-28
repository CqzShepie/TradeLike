import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Customer } from "../types/customer";
import type { NewCustomer } from "../types/newCustomer";

const API_URL = "http://localhost:5001/api/customers";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // GET CUSTOMERS
  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch(API_URL);

        if (!res.ok) {
          throw new Error(`Failed to load customers (${res.status})`);
        }

        const data: Customer[] = await res.json();
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
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCustomer),
      });

      if (!res.ok) {
        throw new Error(`POST failed (${res.status})`);
      }

      const created: Customer = await res.json();

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
      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`DELETE failed (${res.status})`);
      }

      setCustomers((prev) => prev.filter((customer) => customer.id !== id));

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
      const res = await fetch(`${API_URL}/${updatedCustomer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedCustomer),
      });

      if (!res.ok) {
        throw new Error(`PUT failed (${res.status})`);
      }

      const updated: Customer = await res.json();

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