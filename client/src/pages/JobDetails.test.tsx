import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import JobDetails from "./JobDetails";
import { GlobalSearchProvider } from "../contexts/GlobalSearchContext";
import { jobsService } from "../services/jobsService";

import type { Job } from "../types/job";

vi.mock("../services/jobsService", () => ({
  jobsService: {
    getById: vi.fn(),
    update: vi.fn(),
  },
}));

describe("JobDetails notes", () => {
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

function renderJobDetails() {
  return render(
    <MemoryRouter initialEntries={["/jobs/42"]}>
      <GlobalSearchProvider>
        <Routes>
          <Route path="/jobs/:id" element={<JobDetails />} />
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
    ...overrides,
  };
}
