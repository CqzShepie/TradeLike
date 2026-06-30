import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import Logo from "../components/layout/Logo";
import { authService } from "../services/authService";

function Login() {
  const [email, setEmail] = useState("admin@tradelike.co.uk");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(event: React.FormEvent) {
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
    <main className="min-h-screen bg-slate-50">
      <header className="px-8 py-6">
        <Logo />
      </header>

      <div className="flex justify-center px-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold">
            Sign in
          </h1>

          <p className="mb-8 text-slate-600">
            Access your TradeLike account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={event => {
                  setEmail(event.target.value);
                  setError("");
                }}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={event => {
                  setPassword(event.target.value);
                  setError("");
                }}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            No account yet?{" "}
            <Link
              to="/signup"
              className="font-semibold text-blue-600 hover:underline"
            >
              Create Account
            </Link>
          </p>

          <p className="mt-4 text-center">
            <Link
              to="/admin"
              className="text-xs font-medium text-slate-400 hover:text-slate-700"
            >
              Staff Admin Portal
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== ""
    ? error.message
    : fallback;
}

export default Login;