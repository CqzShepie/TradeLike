import { Link } from "react-router-dom";

export default function TrialCta() {
  return (
    <section id="trial" className="bg-blue-700 px-5 py-16 text-white sm:px-6 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">Start today</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Start with a 14-day trial.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50">
            Create your account in under a minute. Add your first customer, quote and job today.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
          <Link
            to="/signup"
            className="inline-flex justify-center rounded-lg bg-white px-6 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Start 14-day free trial
          </Link>
          <Link
            to="/login"
            className="inline-flex justify-center rounded-lg border border-blue-200 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}
