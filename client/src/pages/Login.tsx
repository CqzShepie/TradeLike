import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Logo from "../components/Logo";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (email.trim() === "") {
      setError("Please enter your email address.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.trim() === "") {
      setError("Please enter your password.");
      return;
    }

    setError("");
    navigate("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="px-8 py-6">
        <Logo />
      </header>

      <div className="flex justify-center px-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold">
            Welcome back
          </h1>

          <p className="mb-8 text-slate-600">
            Sign in to your TradeLike account.
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
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
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
                placeholder="••••••••"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Sign In
            </button>

          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-blue-600 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default Login;