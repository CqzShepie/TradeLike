import { Link, useSearchParams } from "react-router-dom";
import { useState, type FormEvent } from "react";
import AuthShell from "../components/auth/AuthShell";
import {
  FormField,
  InlineAlert,
  PrimaryButton,
  TextInput,
} from "../components/ui";
import { authService } from "../services/authService";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(token ? "" : "This reset link is missing a token.");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!token) {
      setError("This reset link is missing a token.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await authService.resetPassword({
        token,
        newPassword: password,
      });
      setMessage(response.message);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getErrorMessage(err, "This reset link is invalid or has expired."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Choose a new TradeLike password."
      description="Reset links expire quickly. If this one has expired, request a new link from the sign-in page."
      highlights={["Private password entry", "Token expires quickly", "Support if you need help"]}
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
          Account recovery
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
          Reset password
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Enter a new password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <FormField label="New password" htmlFor="password">
          <TextInput
            id="password"
            type="password"
            value={password}
            autoComplete="new-password"
            hasError={Boolean(error)}
            onChange={event => {
              setPassword(event.target.value);
              setError("");
            }}
          />
        </FormField>

        <FormField label="Confirm password" htmlFor="confirm-password">
          <TextInput
            id="confirm-password"
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            hasError={Boolean(error)}
            onChange={event => {
              setConfirmPassword(event.target.value);
              setError("");
            }}
          />
        </FormField>

        {error && <InlineAlert tone="error">{error}</InlineAlert>}
        {message && <InlineAlert tone="success">{message}</InlineAlert>}

        <PrimaryButton type="submit" size="lg" fullWidth disabled={loading || Boolean(message)}>
          {loading ? "Resetting..." : "Reset password"}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-300">
        {message ? "Ready to continue? " : "Need a new link? "}
        <Link
          to={message ? "/login" : "/forgot-password"}
          className="font-semibold text-blue-300 hover:text-blue-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {message ? "Back to sign in" : "Request another reset link"}
        </Link>
      </p>
    </AuthShell>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== ""
    ? error.message
    : fallback;
}
