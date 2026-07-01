import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import UsageAnalyticsPage from "./UsageAnalyticsPage";

describe("UsageAnalyticsPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      plan: "Solo",
      requestsPerSecond: 2,
      dailyRequestLimit: 1000,
      days: [
        { date: "2026-07-01T00:00:00Z", requests: 250, exportCalls: 2, automationRuns: 1 },
      ],
    }), { status: 200 })));
  });

  it("renders the mocked usage chart", async () => {
    render(<UsageAnalyticsPage />);

    expect(await screen.findByRole("img", { name: "Requests per day chart" })).toBeInTheDocument();
    expect(screen.getByText("250 / 1000 requests today")).toBeInTheDocument();
  });
});
