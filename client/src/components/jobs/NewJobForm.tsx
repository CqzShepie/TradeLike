import { useEffect, useState, type FormEvent } from "react";

import Card from "../ui/Card";

import type {
  Job,
  JobStatus,
  JobPriority,
} from "../../types/job";

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

  // ✅ NEW FIELD (replaces time)
  const [scheduledDate, setScheduledDate] = useState("");

  const [status, setStatus] = useState<JobStatus>("Scheduled");
  const [priority, setPriority] = useState<JobPriority>("Normal");

  useEffect(() => {
    if (editingJob) {
      setCustomer(editingJob.customer);
      setPhone(editingJob.phone);
      setJobTitle(editingJob.jobTitle);
      setAddress(editingJob.address);

      setScheduledDate(editingJob.scheduledDate || "");

      setStatus(editingJob.status);
      setPriority(editingJob.priority);
    } else {
      setCustomer("");
      setPhone("");
      setJobTitle("");
      setAddress("");
      setScheduledDate("");
      setStatus("Scheduled");
      setPriority("Normal");
    }
  }, [editingJob]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const jobPayload = {
      customer,
      phone,
      jobTitle,
      address,
      scheduledDate,
      status,
      priority,
    };

    if (editingJob && onUpdateJob) {
      onUpdateJob({
        ...editingJob,
        ...jobPayload,
      });
    } else {
      onAddJob(jobPayload);
    }

    setCustomer("");
    setPhone("");
    setJobTitle("");
    setAddress("");
    setScheduledDate("");
    setStatus("Scheduled");
    setPriority("Normal");

    onCancelEdit?.();
  }

  return (
    <Card className="mt-10">
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
        {/* Scheduled Date */}
        <input
          type="datetime-local"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          min="2024-01-01T00:00"
          max="2099-12-31T23:59"
          required
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

        <select
          value={priority}
          onChange={(e) =>
            setPriority(e.target.value as JobPriority)
          }
          className="w-full rounded-lg border px-4 py-3"
        >
          <option value="Low">Low Priority</option>
          <option value="Normal">Normal Priority</option>
          <option value="High">High Priority</option>
          <option value="Urgent">Urgent</option>
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
    </Card>
  );
}

export default NewJobForm;