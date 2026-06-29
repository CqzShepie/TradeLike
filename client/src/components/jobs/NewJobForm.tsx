import { useEffect, useState, type FormEvent } from "react";
import type {
    Job,
    JobPriority,
    JobStatus,
} from "../../types/job";
import type { NewJob } from "../../types/newJob";

type NewJobFormProps = {
    onAddJob: (job: NewJob) => Promise<void> | void;
    onUpdateJob?: (job: Job) => Promise<void> | void;
    editingJob?: Job | null;
    onCancelEdit?: () => void;
};

const statuses: JobStatus[] = [
    "Scheduled",
    "InProgress",
    "Completed",
    "Cancelled",
];

const priorities: JobPriority[] = [
    "Low",
    "Normal",
    "High",
    "Urgent",
];

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
    const [scheduledDate, setScheduledDate] = useState("");
    const [status, setStatus] = useState<JobStatus>("Scheduled");
    const [priority, setPriority] = useState<JobPriority>("Normal");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!editingJob) {
            resetForm();
            return;
        }

        setCustomer(editingJob.customer);
        setPhone(editingJob.phone);
        setJobTitle(editingJob.jobTitle);
        setAddress(editingJob.address);
        setScheduledDate(toDateTimeLocalValue(editingJob.scheduledDate));
        setStatus(editingJob.status);
        setPriority(editingJob.priority);
        setNotes(editingJob.notes ?? "");
        setError("");
    }, [editingJob]);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (customer.trim() === "") {
            setError("Customer is required.");
            return;
        }

        if (phone.trim() === "") {
            setError("Phone number is required.");
            return;
        }

        if (jobTitle.trim() === "") {
            setError("Job title is required.");
            return;
        }

        if (address.trim() === "") {
            setError("Address is required.");
            return;
        }

        if (scheduledDate.trim() === "") {
            setError("Scheduled date is required.");
            return;
        }

        const jobPayload: NewJob = {
            customer: customer.trim(),
            phone: phone.trim(),
            jobTitle: jobTitle.trim(),
            address: address.trim(),
            scheduledDate,
            status,
            priority,
            notes: notes.trim() || null,
            engineerId: editingJob?.engineerId ?? null,
        };

        try {
            setSaving(true);
            setError("");

            if (editingJob && onUpdateJob) {
                await onUpdateJob({
                    ...editingJob,
                    ...jobPayload,
                });
            } else {
                await onAddJob(jobPayload);
                resetForm();
            }

            onCancelEdit?.();
        } catch {
            setError("Unable to save job.");
        } finally {
            setSaving(false);
        }
    }

    function resetForm() {
        setCustomer("");
        setPhone("");
        setJobTitle("");
        setAddress("");
        setScheduledDate("");
        setStatus("Scheduled");
        setPriority("Normal");
        setNotes("");
        setError("");
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
            <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                    {editingJob ? "Edit Job" : "New Job"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Add job details, priority, schedule, and internal notes.
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                    {error}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Customer">
                    <input
                        value={customer}
                        onChange={event => setCustomer(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </Field>

                <Field label="Phone">
                    <input
                        value={phone}
                        onChange={event => setPhone(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </Field>

                <Field label="Job Title">
                    <input
                        value={jobTitle}
                        onChange={event => setJobTitle(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </Field>

                <Field label="Scheduled Date">
                    <input
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={event => setScheduledDate(event.target.value)}
                        min="2024-01-01T00:00"
                        max="2099-12-31T23:59"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </Field>

                <Field label="Status">
                    <select
                        value={status}
                        onChange={event => setStatus(event.target.value as JobStatus)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    >
                        {statuses.map(option => (
                            <option key={option} value={option}>
                                {formatStatus(option)}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Priority">
                    <select
                        value={priority}
                        onChange={event => setPriority(event.target.value as JobPriority)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    >
                        {priorities.map(option => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </Field>

                <div className="md:col-span-2">
                    <Field label="Address">
                        <input
                            value={address}
                            onChange={event => setAddress(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                        />
                    </Field>
                </div>

                <div className="md:col-span-2">
                    <Field label="Job Notes">
                        <textarea
                            value={notes}
                            onChange={event => setNotes(event.target.value)}
                            rows={4}
                            placeholder="Access notes, materials needed, parking, customer preferences, risks, completion notes, etc."
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                        />
                    </Field>
                </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
                {editingJob && onCancelEdit && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                )}

                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                    {saving
                        ? "Saving..."
                        : editingJob
                            ? "Update Job"
                            : "Save Job"}
                </button>
            </div>
        </form>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
                {label}
            </span>

            {children}
        </label>
    );
}

function formatStatus(value: JobStatus) {
    return value === "InProgress" ? "In Progress" : value;
}

function toDateTimeLocalValue(value: string) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value.slice(0, 16);
    }

    const offsetMs = date.getTimezoneOffset() * 60_000;
    const localDate = new Date(date.getTime() - offsetMs);

    return localDate.toISOString().slice(0, 16);
}

export default NewJobForm;