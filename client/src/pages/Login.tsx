import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import AuthShell from "../components/auth/AuthShell";
import {
  FormField,
  InlineAlert,
  PrimaryButton,
  TextInput,
} from "../components/ui";
import { authService } from "../services/authService";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (email.trim() === "") {
      setError("Please enter your email address.");
      return;
    }

    if (password.trim() === "") {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await authService.login({
        email,
        password,
      });

      const params = new URLSearchParams(location.search);
      const returnUrl = params.get("returnUrl");

      if (returnUrl) {
        navigate(returnUrl, { replace: true });
        return;
      }

      navigate(
        authService.isStaffUser(response.user) ? "/admin" : "/dashboard",
        { replace: true }
      );
    } catch (err) {
      setError(getErrorMessage(err, "Unable to sign in."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Run today's trade work from one focused dashboard."
        description="Sign in to manage jobs, customers, quotes and invoices with the same polished workspace introduced on the homepage."
      highlights={["Schedule jobs", "Track quotes", "Manage customers"]}
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
          TradeLike account
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
          Sign in
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Access your workspace and pick up where you left off.
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
            }}
          />
        </FormField>

        <FormField label="Password" htmlFor="password">
          <TextInput
            id="password"
            type="password"
            value={password}
            autoComplete="current-password"
            hasError={Boolean(error)}
            onChange={event => {
              setPassword(event.target.value);
              setError("");
            }}
          />
        </FormField>

        <div className="-mt-2 text-right">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-blue-300 hover:text-blue-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Forgot password?
          </Link>
        </div>

        {error && <InlineAlert tone="error">{error}</InlineAlert>}

        <PrimaryButton type="submit" size="lg" fullWidth disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-300">
        No account yet?{" "}
        <Link
          to="/signup"
          className="font-semibold text-blue-300 hover:text-blue-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Start 14-day free trial
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

export default Login;
