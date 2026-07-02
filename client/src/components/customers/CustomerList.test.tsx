import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import CustomerList from "./CustomerList";

describe("CustomerList", () => {
  it("uses one muted empty message for missing customer notes", () => {
    render(
      <MemoryRouter>
        <CustomerList
          customers={[
            {
              id: 1,
              name: "Sarah Johnson",
              email: "sarah@example.com",
              phone: "07981 125031",
              address: "1 Trade Street",
              notes: null,
            },
          ]}
          onDeleteCustomer={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getAllByText("Nothing recorded yet.").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Has notes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No notes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No notes recorded/i)).not.toBeInTheDocument();
  });

  it("still renders existing customer notes", () => {
    render(
      <MemoryRouter>
        <CustomerList
          customers={[
            {
              id: 1,
              name: "Sarah Johnson",
              email: "sarah@example.com",
              phone: "07981 125031",
              address: "1 Trade Street",
              notes: "Prefers morning appointments.",
            },
          ]}
          onDeleteCustomer={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getAllByText("Prefers morning appointments.").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Has notes/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Nothing recorded yet.")).not.toBeInTheDocument();
  });
});
