import { Link } from "react-router-dom";
import Logo from "../layout/Logo";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#trial", label: "Trial" },
  { href: "#faq", label: "FAQ" },
];

export default function HomeHeader() {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Logo tone="dark" />
          <Link
            to="/signup"
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-950/40 transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 sm:hidden"
          >
            Start 14-day free trial
          </Link>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
          <nav
            aria-label="Homepage"
            className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-slate-300"
          >
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="transition hover:text-white focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-950/40 transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
            >
              Start 14-day free trial
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}