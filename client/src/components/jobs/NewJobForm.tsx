import { useEffect, useState, type FormEvent } from "react";
import type { Job, JobStatus } from "../../types/job";
import type { NewJob } from "../../types/newJob";

type NewJobFormProps = {
  onAddJob: (job: NewJob) => void;
  onUpdateJob?: (job: Job) => void;
  editingJob?: Job | null;
  onCancelEdit?: () => void;
};

function NewJobForm({
  onAddJob,
  onUpdateJob,
  editingJob,
  onCancelEdit,
}: NewJobFormProps) {
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [address, setAddress] = useState("");
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<JobStatus>("Scheduled");

  useEffect(() => {
    if (editingJob) {
      setCustomer(editingJob.customer);
      setPhone(editingJob.phone);
      setJobTitle(editingJob.jobTitle);
      setAddress(editingJob.address);
      setTime(editingJob.time);
      setStatus(editingJob.status);
    } else {
      setCustomer("");
      setPhone("");
      setJobTitle("");
      setAddress("");
      setTime("");
      setStatus("Scheduled");
    }
  }, [editingJob]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (editingJob && onUpdateJob) {
      onUpdateJob({
        ...editingJob,
        customer,
        phone,
        jobTitle,
        address,
        time,
        status,
      });
    } else {
      onAddJob({
        customer,
        phone,
        jobTitle,
        address,
        time,
        status,
      });
    }

    setCustomer("");
    setPhone("");
    setJobTitle("");
    setAddress("");
    setTime("");
    setStatus("Scheduled");

    onCancelEdit?.();
  }

  return (
    <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-2xl font-bold">
        {editingJob ? "Edit Job" : "New Job"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <input
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder="Customer"
          className="w-full rounded-lg border px-4 py-3"
        />

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone Number"
          className="w-full rounded-lg border px-4 py-3"
        />

        <input
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Job Title"
          className="w-full rounded-lg border px-4 py-3"
        />

        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address"
          className="w-full rounded-lg border px-4 py-3"
        />

        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full rounded-lg border px-4 py-3"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as JobStatus)}
          className="w-full rounded-lg border px-4 py-3"
        >
          <option value="Scheduled">Scheduled</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            {editingJob ? "Update Job" : "Save Job"}
          </button>

          {editingJob && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg border px-6 py-3 text-gray-600 transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default NewJobForm;