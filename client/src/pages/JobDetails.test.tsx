import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import JobDetails from "./JobDetails";
import { GlobalSearchProvider } from "../contexts/GlobalSearchContext";
import { ApiError } from "../services/apiClient";
import { jobsService } from "../services/jobsService";
import { quotesService } from "../services/quotesService";

import type { Job } from "../types/job";
import type { Quote } from "../types/quote";

vi.mock("../services/jobsService", () => ({
  jobsService: {
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    linkQuote: vi.fn(),
    unlinkQuote: vi.fn(),
  },
}));

vi.mock("../services/quotesService", () => ({
  quotesService: {
    getAll: vi.fn(),
  },
}));

describe("JobDetails notes", () => {
  beforeEach(() => {
    vi.mocked(quotesService.getAll).mockResolvedValue([]);
    vi.mocked(jobsService.delete).mockReset();
    vi.mocked(jobsService.linkQuote).mockReset();
    vi.mocked(jobsService.unlinkQuote).mockReset();
  });

  it("uses one muted empty message for empty job notes", async () => {
    vi.mocked(jobsService.getById).mockResolvedValue(buildJob({ notes: null }));

    renderJobDetails();

    expect(await screen.findByText("Nothing recorded yet.")).toBeInTheDocument();
    expect(screen.queryByText(/No notes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No notes recorded/i)).not.toBeInTheDocument();
  });

  it("still renders existing job note cards", async () => {
    vi.mocked(jobsService.getById).mockResolvedValue(buildJob({
      notes: "[note:2026-07-01T12:00:00.000Z:Jane] Boiler access is through the side gate.",
    }));

    renderJobDetails();

    expect(await screen.findByText("Boiler access is through the side gate.")).toBeInTheDocument();
    expect(screen.queryByText("Nothing recorded yet.")).not.toBeInTheDocument();
  });
});

describe("JobDetails linked quote", () => {
  beforeEach(() => {
    vi.mocked(quotesService.getAll).mockResolvedValue([buildQuote()]);
    vi.mocked(jobsService.linkQuote).mockResolvedValue(buildJob({
      quoteId: 101,
      sourceQuote: buildQuote(),
    }));
    vi.mocked(jobsService.unlinkQuote).mockResolvedValue(buildJob({
      quoteId: null,
      sourceQuote: null,
    }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a linked quote section for an existing job with no quote", async () => {
    vi.mocked(jobsService.getById).mockResolvedValue(buildJob({ quoteId: null, sourceQuote: null }));

    renderJobDetails();

    expect((await screen.findAllByText("Linked quote")).length).toBeGreaterThan(0);
    expect(screen.getByText("No quote linked")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /link quote/i })).toBeInTheDocument();
  });

  it("opens the quote selector and links a selected quote", async () => {
    vi.mocked(jobsService.getById).mockResolvedValue(buildJob({ quoteId: null, sourceQuote: null }));

    renderJobDetails();

    fireEvent.click(await screen.findByRole("button", { name: /link quote/i }));

    expect(await screen.findByRole("dialog", { name: /link quote/i })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /Quote #101 - Bathroom refit/i }));

    await waitFor(() => expect(jobsService.linkQuote).toHaveBeenCalledWith(42, 101));
    expect(await screen.findByRole("link", { name: /view quote/i })).toHaveAttribute("href", "/quotes/101");
    expect(screen.getByText("Bathroom refit")).toBeInTheDocument();
  });

  it("shows linked quote summary and unlinks with confirmation", async () => {
    vi.mocked(jobsService.getById).mockResolvedValue(buildJob({
      quoteId: 101,
      sourceQuote: buildQuote(),
    }));

    renderJobDetails();

    expect(await screen.findByText("Bathroom refit")).toBeInTheDocument();
    expect(screen.getAllByText("Sarah Johnson").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /view quote/i })).toHaveAttribute("href", "/quotes/101");

    fireEvent.click(screen.getByRole("button", { name: /unlink quote/i }));

    await waitFor(() => expect(jobsService.unlinkQuote).toHaveBeenCalledWith(42));
    expect(await screen.findByText("No quote linked")).toBeInTheDocument();
  });

  it("shows friendly validation when the backend rejects a quote link", async () => {
    vi.mocked(jobsService.getById).mockResolvedValue(buildJob({ quoteId: null, sourceQuote: null }));
    vi.mocked(quotesService.getAll).mockResolvedValue([buildQuote({ status: "Rejected" })]);
    vi.mocked(jobsService.linkQuote).mockRejectedValue(new ApiError(400, "This quote cannot be linked."));

    renderJobDetails();

    fireEvent.click(await screen.findByRole("button", { name: /link quote/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Quote #101 - Bathroom refit/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This quote cannot be linked.");
  });

  it("shows a permission message when quote linking returns 403", async () => {
    vi.mocked(jobsService.getById).mockResolvedValue(buildJob({ quoteId: null, sourceQuote: null }));
    vi.mocked(jobsService.linkQuote).mockRejectedValue(new ApiError(403, "Forbidden"));

    renderJobDetails();

    fireEvent.click(await screen.findByRole("button", { name: /link quote/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Quote #101 - Bathroom refit/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You do not have permission to link quotes.");
  });
});

describe("JobDetails delete", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Delete job and navigates back to jobs after deleting", async () => {
    vi.mocked(jobsService.getById).mockResolvedValue(buildJob());
    vi.mocked(jobsService.delete).mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderJobDetails();

    fireEvent.click(await screen.findByRole("button", { name: /delete job/i }));

    await waitFor(() => expect(jobsService.delete).toHaveBeenCalledWith(42));
    expect(window.confirm).toHaveBeenCalledWith("Are you sure you want to delete this job?");
    expect(await screen.findByText("Jobs index")).toBeInTheDocument();
  });

  it("shows an error when delete fails", async () => {
    vi.mocked(jobsService.getById).mockResolvedValue(buildJob());
    vi.mocked(jobsService.delete).mockRejectedValue(new Error("Unable to delete job."));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderJobDetails();

    fireEvent.click(await screen.findByRole("button", { name: /delete job/i }));

    expect(await screen.findByText("Unable to delete job.")).toBeInTheDocument();
  });
});

function renderJobDetails() {
  return render(
    <MemoryRouter initialEntries={["/jobs/42"]}>
      <GlobalSearchProvider>
        <Routes>
          <Route path="/jobs/:id" element={<JobDetails />} />
          <Route path="/jobs" element={<div>Jobs index</div>} />
        </Routes>
      </GlobalSearchProvider>
    </MemoryRouter>
  );
}

function buildJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 42,
    customerId: 7,
    customer: "Sarah Johnson",
    phone: "07981 125031",
    jobTitle: "Boiler service",
    address: "1 Trade Street",
    scheduledDate: "2026-07-02T09:00:00.000Z",
    status: "Scheduled",
    priority: "Normal",
    notes: null,
    quoteId: null,
    engineerId: null,
    sourceQuote: null,
    ...overrides,
  };
}

function buildQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 101,
    customerId: 7,
    customerName: "Sarah Johnson",
    title: "Bathroom refit",
    description: null,
    amount: 1200,
    subtotal: 1000,
    vatTotal: 200,
    discountType: "Amount",
    discountValue: 0,
    discountTotal: 0,
    total: 1200,
    status: "Sent",
    notes: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    lineItems: [],
    ...overrides,
  };
}
