import { Link } from "react-router-dom";
import Logo from "../layout/Logo";

export default function HomeFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-5 py-8 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo tone="dark" />
          <p className="mt-2 max-w-xl">
            Job, quote, customer and scheduling software for UK trade businesses.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-4">
          <Link
            to="/login"
            className="font-semibold text-slate-300 transition hover:text-white focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="font-semibold text-slate-300 transition hover:text-white focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
          >
            Signup
          </Link>
        </nav>
      </div>
    </footer>
  );
}