export type CustomerTerminology = "Customers" | "Clients";

const storageKey = "tradelike_customer_terminology";

export const terminologyService = {
  getCustomerLabel(): CustomerTerminology {
    const stored = localStorage.getItem(storageKey);
    return stored === "Clients" ? "Clients" : "Customers";
  },

  setCustomerLabel(value: CustomerTerminology) {
    localStorage.setItem(storageKey, value);
    window.dispatchEvent(new Event("tradelike-terminology-updated"));
  },

  subscribe(callback: () => void) {
    window.addEventListener("tradelike-terminology-updated", callback);
    window.addEventListener("storage", callback);
    return () => {
      window.removeEventListener("tradelike-terminology-updated", callback);
      window.removeEventListener("storage", callback);
    };
  },
};
