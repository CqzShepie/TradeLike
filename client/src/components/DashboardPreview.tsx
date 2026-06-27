function DashboardPreview() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="rounded-2xl border bg-white p-8 shadow-sm">

        <h2 className="mb-8 text-3xl font-bold">
          Dashboard Preview
        </h2>

        <div className="grid gap-6 md:grid-cols-2">

          <div className="rounded-xl border p-6">
            <h3 className="mb-4 text-xl font-semibold">
              Today's Jobs
            </h3>

            <p>09:00 Boiler Service</p>
            <p>11:00 Leaking Tap</p>
            <p>14:00 Bathroom Quote</p>
          </div>

          <div className="rounded-xl border p-6">
            <h3 className="mb-4 text-xl font-semibold">
              New Enquiries
            </h3>

            <p className="text-5xl font-bold text-blue-600">
              3
            </p>
          </div>

          <div className="rounded-xl border p-6">
            <h3 className="mb-4 text-xl font-semibold">
              Outstanding Invoices
            </h3>

            <p className="text-5xl font-bold text-green-600">
              £420
            </p>
          </div>

          <div className="rounded-xl border p-6">
            <h3 className="mb-4 text-xl font-semibold">
              Next Appointment
            </h3>

            <p>Tomorrow</p>
            <p>08:30 Bathroom Installation</p>
          </div>

        </div>
      </div>
    </section>
  );
}

export default DashboardPreview;