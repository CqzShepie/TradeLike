import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DesignerPage from "./DesignerPage";

describe("DesignerPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("connecting Trigger to Action enables Save button", () => {
    render(
      <MemoryRouter initialEntries={["/settings/automations/designer/1"]}>
        <Routes>
          <Route path="/settings/automations/designer/:workflowId" element={<DesignerPage />} />
        </Routes>
      </MemoryRouter>
    );

    const save = screen.getByRole("button", { name: /save diagram/i });
    expect(save).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /connect trigger to action/i }));

    expect(save).toBeEnabled();
    expect(screen.getByTestId("edge-summary")).toHaveTextContent("trigger-1 -> action-1");
  });
});
