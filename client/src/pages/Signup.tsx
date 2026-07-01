import { Link, useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import AuthShell from "../components/auth/AuthShell";
import {
  FormField,
  InlineAlert,
  PrimaryButton,
  TextInput,
} from "../components/ui";
import { authService } from "../services/authService";

function Signup() {
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedBusinessName = businessName.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (trimmedBusinessName === "") {
      setError("Please enter your business name.");
      return;
    }

    if (trimmedEmail === "") {
      setError("Please enter your email address.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (trimmedPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await authService.register({
        businessName: trimmedBusinessName,
        email: trimmedEmail,
        password: trimmedPassword,
      });

      navigate(
        authService.isStaffUser(response.user) ? "/admin" : "/dashboard",
        { replace: true }
      );
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create your account."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Start your workspace"
      title="Bring every job, quote and customer into one clean system."
      description="Create your TradeLike account and start shaping a calmer way to run your trade business."
      highlights={["14-day trial", "No card needed", "Cancel anytime"]}
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
          TradeLike trial
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
          Create your account
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Start a 14-day free trial built for UK trade businesses.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <FormField label="Business name" htmlFor="businessName">
          <TextInput
            id="businessName"
            type="text"
            placeholder="Smith Plumbing"
            value={businessName}
            autoComplete="organization"
            hasError={Boolean(error)}
            onChange={event => {
              setBusinessName(event.target.value);
              setError("");
            }}
          />
        </FormField>

        <FormField label="Email address" htmlFor="email">
          <TextInput
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            autoComplete="email"
            hasError={Boolean(error)}
            onChange={event => {
              setEmail(event.target.value);
              setError("");
            }}
          />
        </FormField>

        <FormField label="Password" htmlFor="password">
          <TextInput
            id="password"
            type="password"
            placeholder="Minimum 8 characters"
            value={password}
            autoComplete="new-password"
            hasError={Boolean(error)}
            onChange={event => {
              setPassword(event.target.value);
              setError("");
            }}
          />
        </FormField>

        <FormField label="Confirm password" htmlFor="confirmPassword">
          <TextInput
            id="confirmPassword"
            type="password"
            placeholder="Repeat your password"
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

        <PrimaryButton type="submit" size="lg" fullWidth disabled={loading}>
          {loading ? "Creating account..." : "Start 14-day free trial"}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-300">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-blue-300 hover:text-blue-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Sign in
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

export default Signup;
