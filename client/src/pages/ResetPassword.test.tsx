import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResetPassword from "./ResetPassword";
import { authService } from "../services/authService";

vi.mock("../services/authService", () => ({
  authService: {
    resetPassword: vi.fn(),
  },
}));

describe("ResetPassword", () => {
  beforeEach(() => {
    vi.mocked(authService.resetPassword).mockResolvedValue({
      message: "Your password has been reset. You can now sign in.",
    });
  });

  it("validates matching passwords before calling the API", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "Different123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/passwords must match/i)).toBeInTheDocument();
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it("submits a valid token and links back to login on success", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => expect(authService.resetPassword).toHaveBeenCalledWith({
      token: "abc123",
      newPassword: "Password123!",
    }));
    expect(screen.getByRole("link", { name: /back to sign in/i })).toHaveAttribute(
      "href",
      "/login"
    );
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/reset-password?token=abc123"]}>
      <ResetPassword />
    </MemoryRouter>
  );
}
