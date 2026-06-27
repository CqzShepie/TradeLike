function Features() {
  return (
    <section className="mx-auto max-w-7xl px-8 py-24">

      <h2 className="mb-16 text-center text-4xl font-bold">
        Everything you need to run your trade business
      </h2>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <h3 className="mb-3 text-xl font-semibold">
            📅 Online Bookings
          </h3>

          <p className="text-slate-600">
            Customers can book jobs 24/7 even while you're on site.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <h3 className="mb-3 text-xl font-semibold">
            💷 AI Quotes
          </h3>

          <p className="text-slate-600">
            Create professional quotes in seconds.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <h3 className="mb-3 text-xl font-semibold">
            📄 Invoices
          </h3>

          <p className="text-slate-600">
            Send invoices instantly and get paid faster.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <h3 className="mb-3 text-xl font-semibold">
            🤖 AI Assistant
          </h3>

          <p className="text-slate-600">
            Let AI organise bookings and reduce admin.
          </p>
        </div>

      </div>

    </section>
  )
}

export default Features