import { useState } from "react";
import type { NewJob } from "../types/newJob";

type NewJobFormProps = {
  onAddJob: (job: NewJob) => void;
};

function NewJobForm({ onAddJob }: NewJobFormProps) {
  const [customer, setCustomer] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [time, setTime] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    onAddJob({
      customer,
      job: jobTitle,
      time,
    });

    setCustomer("");
    setJobTitle("");
    setTime("");
  }

  return (
    <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-2xl font-bold">
        New Job
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Customer Name
          </label>

          <input
            type="text"
            value={customer}
            onChange={(event) => setCustomer(event.target.value)}
            placeholder="John Williams"
            className="w-full rounded-lg border border-slate-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Job Title
          </label>

          <input
            type="text"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            placeholder="Boiler Service"
            className="w-full rounded-lg border border-slate-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Time
          </label>

          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-3"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
        >
          Save Job
        </button>
      </form>
    </div>
  );
}

export default NewJobForm;