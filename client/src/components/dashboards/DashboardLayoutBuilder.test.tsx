import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DashboardLayoutBuilder from "./DashboardLayoutBuilder";

describe("DashboardLayoutBuilder", () => {
  it("moving widget updates LayoutJson", () => {
    const onLayoutChange = vi.fn();

    render(
      <DashboardLayoutBuilder
        initialItems={[{ id: "revenue", title: "Revenue KPI", type: "KPI", x: 0, y: 0, w: 1, h: 1 }]}
        onLayoutChange={onLayoutChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /move widget/i }));

    expect(onLayoutChange).toHaveBeenCalledWith(expect.stringContaining('"x":1'));
  });
});
