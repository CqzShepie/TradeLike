import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TemplateEditor from "./TemplateEditor";

describe("TemplateEditor", () => {
  it("updates the live preview as html changes", async () => {
    render(<TemplateEditor onSave={vi.fn()} />);

    const editor = screen.getByLabelText("HTML");
    fireEvent.change(editor, { target: { value: "<h1>{{Invoice.InvoiceNumber}}</h1>" } });

    expect(screen.getByTestId("template-preview")).toHaveTextContent("INV-1042");
  });
});
