import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PermissionsMatrixPage from "./PermissionsMatrixPage";

describe("PermissionsMatrixPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return new Response(JSON.stringify({
          permissions: [
            { roleName: "CustomerEmployee", entity: "Jobs", field: "InternalNotes", permission: "Read" },
          ],
        }), { status: 200 });
      }

      return new Response(JSON.stringify({
        permissions: [
          { roleName: "CustomerEmployee", entity: "Jobs", field: "InternalNotes", permission: "Hidden" },
        ],
      }), { status: 200 });
    }));
  });

  it("toggles and saves a permission", async () => {
    render(<PermissionsMatrixPage />);

    fireEvent.change(await screen.findByRole("combobox"), { target: { value: "Read" } });
    fireEvent.click(screen.getByRole("button", { name: "Save matrix" }));

    expect(await screen.findByText("Permissions saved.")).toBeInTheDocument();
  });
});
