import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import WebhookDesignerPage from "./WebhookDesignerPage";

describe("WebhookDesignerPage", () => {
  it("transform preview renders JSON", () => {
    render(
      <MemoryRouter>
        <WebhookDesignerPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId("transform-preview")).toHaveTextContent('"status": "Paid"');
    expect(screen.getByTestId("transform-preview")).toHaveTextContent('"total": 120');
  });
});
