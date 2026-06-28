import { Link } from "react-router-dom";

function Hero() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center">
      <h2 className="mb-6 text-6xl font-extrabold text-slate-900">
        Never miss another job.
      </h2>

      <p className="mb-10 max-w-2xl text-xl text-slate-600">
        TradeLike helps tradespeople capture enquiries, organise bookings and
        spend less time on admin.
      </p>

      <div className="flex gap-4">
        <Link
          to="/signup"
          className="rounded-xl bg-blue-600 px-8 py-4 text-lg text-white hover:bg-blue-700"
        >
          Start Free
        </Link>

        <button className="rounded-xl border border-slate-300 px-8 py-4 text-lg hover:bg-slate-100">
          Learn More
        </button>
      </div>
    </section>
  );
}

export default Hero;