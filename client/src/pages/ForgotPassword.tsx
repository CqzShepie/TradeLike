import { Link } from "react-router-dom";
import { useState, type FormEvent } from "react";
import AuthShell from "../components/auth/AuthShell";
import {
  FormField,
  InlineAlert,
  PrimaryButton,
  TextInput,
} from "../components/ui";
import { authService } from "../services/authService";

const genericMessage =
  "If an account exists for that email, we'll send a password reset link.";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (email.trim() === "") {
      setError("Please enter your email address.");
      setMessage("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await authService.forgotPassword({ email });
      setMessage(response.message || genericMessage);
    } catch {
      setMessage(genericMessage);
      setError("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Get a secure link to reset your password."
      description="Enter the email address for your TradeLike account. If we find a matching active account, we'll send a reset link."
      highlights={["Secure reset link", "Short expiry", "No account details revealed"]}
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
          Account recovery
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
          Forgot password?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          We'll help you get back in without exposing whether an email is registered.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <FormField label="Email address" htmlFor="email">
          <TextInput
            id="email"
            type="email"
            value={email}
            autoComplete="email"
            hasError={Boolean(error)}
            onChange={event => {
              setEmail(event.target.value);
              setError("");
              setMessage("");
            }}
          />
        </FormField>

        {error && <InlineAlert tone="error">{error}</InlineAlert>}
        {message && <InlineAlert tone="success">{message}</InlineAlert>}

        <PrimaryButton type="submit" size="lg" fullWidth disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-300">
        Remembered it?{" "}
        <Link
          to="/login"
          className="font-semibold text-blue-300 hover:text-blue-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
