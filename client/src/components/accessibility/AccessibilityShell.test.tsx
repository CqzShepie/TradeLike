import { render, screen } from "@testing-library/react";

import AccessibilityShell from "./AccessibilityShell";

describe("AccessibilityShell", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps accessibility support without rendering the floating button", () => {
    render(
      <AccessibilityShell>
        <main>Workspace</main>
      </AccessibilityShell>
    );

    expect(screen.getByText("Skip to main content")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accessibility" })).not.toBeInTheDocument();
  });
});
