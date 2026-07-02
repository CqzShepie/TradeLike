import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import CalendarPage from "./Calendar";
import { GlobalSearchProvider } from "../contexts/GlobalSearchContext";

vi.mock("../components/calendar/WeekCalendar", () => ({
  default: () => <div>Calendar board</div>,
}));

describe("CalendarPage", () => {
  it("starts with the calendar board instead of promotional stat cards", () => {
    render(
      <MemoryRouter>
        <GlobalSearchProvider>
          <CalendarPage />
        </GlobalSearchProvider>
      </MemoryRouter>
    );

    expect(screen.queryByText("Week view")).not.toBeInTheDocument();
    expect(screen.getByText("Calendar board")).toBeInTheDocument();
  });
});
