import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ForgotPassword from "./ForgotPassword";
import { authService } from "../services/authService";

vi.mock("../services/authService", () => ({
  authService: {
    forgotPassword: vi.fn(),
  },
}));

describe("ForgotPassword", () => {
  beforeEach(() => {
    vi.mocked(authService.forgotPassword).mockResolvedValue({
      message: "If an account exists for that email, we'll send a password reset link.",
    });
  });

  it("submits the email and shows the generic success message", async () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "USER@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => expect(authService.forgotPassword).toHaveBeenCalledWith({
      email: "USER@example.com",
    }));
    expect(await screen.findByText(/if an account exists/i)).toBeInTheDocument();
  });
});
