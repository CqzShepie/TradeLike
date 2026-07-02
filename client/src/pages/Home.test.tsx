import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Home from "./Home";

describe("Home", () => {
  it("shows current monthly pricing and Enterprise sales contact", () => {
    renderHome();

    expect(screen.getByText("£32.95/month")).toBeInTheDocument();
    expect(screen.getByText("£119.95/month")).toBeInTheDocument();
    expect(screen.getByText("£229.95/month")).toBeInTheDocument();
    expect(screen.getByText("Contact Sales")).toBeInTheDocument();
    expect(screen.getByText("£32.95/user")).toBeInTheDocument();
    expect(screen.getByText("£12.00/user")).toBeInTheDocument();
    expect(screen.getByText("£9.20/user")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByText("26+ users")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "sales@tradelike.co.uk" }).some(link => link.getAttribute("href") === "mailto:sales@tradelike.co.uk")).toBe(true);
    const pageText = document.body.textContent ?? "";
    [
      ["39", "95/month"],
      ["44", "95/month"],
      ["99", "95/month"],
      ["159", "95/month"],
      ["40", "/month"],
      ["99", "/month"],
      ["199", "/month"],
      ["40", "00/month"],
      ["99", "00/month"],
      ["199", "00/month"],
    ].forEach(([pounds, suffix]) => {
      expect(pageText).not.toContain(`£${pounds}${suffix.startsWith("/") ? suffix : `.${suffix}`}`);
    });
  });

  it("explains invoices, team, mobile, support and admin time savings", () => {
    renderHome();

    expect(screen.getByText(/Can I send invoices to customers quickly/i)).toBeInTheDocument();
    expect(screen.getByText(/Does it work on mobile/i)).toBeInTheDocument();
    expect(screen.getByText(/Can my team use it/i)).toBeInTheDocument();
    expect(screen.getByText(/How do I contact support or sales/i)).toBeInTheDocument();
    expect(screen.getByText(/save 2-6 admin hours a week/i)).toBeInTheDocument();
  });

  it("shows footer emails in order without login or signup links", () => {
    renderHome();

    const footer = screen.getByRole("contentinfo");
    const links = within(footer).getAllByRole("link")
      .filter(link => link.getAttribute("href")?.startsWith("mailto:"));

    expect(links.map(link => link.textContent)).toEqual([
      "hello@tradelike.co.uk",
      "support@tradelike.co.uk",
      "sales@tradelike.co.uk",
    ]);
    expect(within(footer).queryByRole("link", { name: /login/i })).not.toBeInTheDocument();
    expect(within(footer).queryByRole("link", { name: /sign up|signup/i })).not.toBeInTheDocument();
  });

  it("does not show repeated old calm workspace copy", () => {
    renderHome();

    expect(screen.queryByText(/Job scheduling, quotes, customers and admin in one calm workspace\./i)).not.toBeInTheDocument();
  });
});

function renderHome() {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}
