import { useEffect, useState, type FormEvent } from "react";
import type {
    Job,
    JobPriority,
    JobStatus,
} from "../../types/job";
import type { NewJob } from "../../types/newJob";
import { SelectMenu, TextArea, TextInput } from "../ui";

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
            className="rounded-xl border border-white/10 bg-slate-950/50 p-6 shadow-sm shadow-slate-950/30"
        >
            <div className="mb-5">
                <h2 className="text-lg font-bold text-white">
                    {editingJob ? "Edit Job" : "New Job"}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
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
                    <TextInput
                        value={customer}
                        onChange={event => setCustomer(event.target.value)}
                    />
                </Field>

                <Field label="Phone">
                    <TextInput
                        value={phone}
                        onChange={event => setPhone(event.target.value)}
                    />
                </Field>

                <Field label="Job Title">
                    <TextInput
                        value={jobTitle}
                        onChange={event => setJobTitle(event.target.value)}
                    />
                </Field>

                <Field label="Scheduled Date">
                    <TextInput
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={event => setScheduledDate(event.target.value)}
                        min="2024-01-01T00:00"
                        max="2099-12-31T23:59"
                    />
                </Field>

                <Field label="Status">
                    <SelectMenu
                        ariaLabel="Job form status"
                        value={status}
                        onChange={value => setStatus(value as JobStatus)}
                        options={statuses.map(option => ({ value: option, label: formatStatus(option) }))}
                    />
                </Field>

                <Field label="Priority">
                    <SelectMenu
                        ariaLabel="Job form priority"
                        value={priority}
                        onChange={value => setPriority(value as JobPriority)}
                        options={priorities.map(option => ({ value: option, label: option }))}
                    />
                </Field>

                <div className="md:col-span-2">
                    <Field label="Address">
                        <TextInput
                            value={address}
                            onChange={event => setAddress(event.target.value)}
                        />
                    </Field>
                </div>

                <div className="md:col-span-2">
                    <Field label="Job Notes">
                        <TextArea
                            value={notes}
                            onChange={event => setNotes(event.target.value)}
                            rows={4}
                            placeholder="Access notes, materials needed, parking, customer preferences, risks, completion notes, etc."
                        />
                    </Field>
                </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
                {editingJob && onCancelEdit && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-white/10"
                    >
                        Cancel
                    </button>
                )}

                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
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
            <span className="mb-1 block text-sm font-medium text-slate-300">
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
