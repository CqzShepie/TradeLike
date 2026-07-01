import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AccountingProviderCard from "./AccountingProviderCard";

describe("AccountingProviderCard", () => {
  it("shows a connected badge", () => {
    render(
      <AccountingProviderCard
        provider="Xero"
        connected={true}
        lastSyncAtUtc="2026-07-01T12:00:00Z"
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );

    expect(screen.getByText("Connected")).toBeInTheDocument();
  });
});
