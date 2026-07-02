import { useEffect, useState, type FormEvent } from "react";
import type {
    Job,
    JobPriority,
    JobStatus,
} from "../../types/job";
import type { Customer } from "../../types/customer";
import type { NewJob } from "../../types/newJob";
import type { NewCustomer } from "../../types/newCustomer";
import { customersService } from "../../services/customersService";
import { SelectMenu, TextArea, TextInput } from "../ui";
import JobQuoteLinkPanel from "./JobQuoteLinkPanel";

type NewJobFormProps = {
    onAddJob: (job: NewJob) => Promise<void> | void;
    onUpdateJob?: (job: Job) => Promise<void> | void;
    editingJob?: Job | null;
    onCancelEdit?: () => void;
    onJobChange?: (job: Job) => void;
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
    onJobChange,
}: NewJobFormProps) {
    const [customer, setCustomer] = useState("");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
    const [showCustomerCreate, setShowCustomerCreate] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");
    const [newCustomerEmail, setNewCustomerEmail] = useState("");
    const [newCustomerAddress, setNewCustomerAddress] = useState("");
    const [newCustomerNotes, setNewCustomerNotes] = useState("");
    const [creatingCustomer, setCreatingCustomer] = useState(false);
    const [phone, setPhone] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [address, setAddress] = useState("");
    const [scheduledDate, setScheduledDate] = useState("");
    const [status, setStatus] = useState<JobStatus>("Scheduled");
    const [priority, setPriority] = useState<JobPriority>("Normal");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");
    const [customerError, setCustomerError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadCustomers() {
            try {
                setLoadingCustomers(true);
                const rows = await customersService.getAll();

                if (!cancelled) {
                    setCustomers(rows);
                }
            } catch {
                if (!cancelled) {
                    setCustomers([]);
                }
            } finally {
                if (!cancelled) {
                    setLoadingCustomers(false);
                }
            }
        }

        void loadCustomers();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!editingJob) {
            resetForm();
            return;
        }

        setCustomer(editingJob.customer);
        setCustomerSearch(editingJob.customer);
        setSelectedCustomerId(editingJob.customerId ? String(editingJob.customerId) : "");
        setPhone(editingJob.phone);
        setJobTitle(editingJob.jobTitle);
        setAddress(editingJob.address);
        setScheduledDate(toDateTimeLocalValue(editingJob.scheduledDate));
        setStatus(editingJob.status);
        setPriority(editingJob.priority);
        setNotes(editingJob.notes ?? "");
        setError("");
    }, [editingJob]);

    const filteredCustomers = customers
        .filter(item => {
            const search = customerSearch.trim().toLowerCase();

            if (search === "") {
                return true;
            }

            return [
                String(item.id),
                item.name,
                item.email,
                item.phone,
                item.address,
            ]
                .join(" ")
                .toLowerCase()
                .includes(search);
        })
        .slice(0, 20);

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
            setError("Job needed is required.");
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
        setSelectedCustomerId("");
        setCustomerSearch("");
        setCustomerPickerOpen(false);
        setShowCustomerCreate(false);
        setPhone("");
        setJobTitle("");
        setAddress("");
        setScheduledDate("");
        setStatus("Scheduled");
        setPriority("Normal");
        setNotes("");
        setError("");
        setCustomerError("");
    }

    function selectCustomer(nextCustomer: Customer) {
        setSelectedCustomerId(String(nextCustomer.id));
        setCustomerSearch(nextCustomer.name);
        setCustomer(nextCustomer.name);
        setPhone(nextCustomer.phone);
        setAddress(nextCustomer.address);
        setCustomerPickerOpen(false);
        setShowCustomerCreate(false);
        setCustomerError("");
        setError("");
    }

    async function createInlineCustomer() {
        if (newCustomerName.trim() === "") {
            setCustomerError("Customer name is required.");
            return;
        }

        const payload: NewCustomer = {
            name: newCustomerName.trim(),
            phone: newCustomerPhone.trim(),
            email: newCustomerEmail.trim(),
            address: newCustomerAddress.trim(),
            notes: newCustomerNotes.trim() || null,
        };

        try {
            setCreatingCustomer(true);
            setCustomerError("");
            const created = await customersService.create(payload);
            setCustomers(previous => [created, ...previous.filter(item => item.id !== created.id)]);
            selectCustomer(created);
            setNewCustomerName("");
            setNewCustomerPhone("");
            setNewCustomerEmail("");
            setNewCustomerAddress("");
            setNewCustomerNotes("");
        } catch {
            setCustomerError("Unable to create customer.");
        } finally {
            setCreatingCustomer(false);
        }
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
                    <div
                        className="relative"
                        onBlur={() => {
                            window.setTimeout(() => setCustomerPickerOpen(false), 150);
                        }}
                    >
                        <TextInput
                            value={customerSearch}
                            onFocus={() => setCustomerPickerOpen(true)}
                            onChange={event => {
                                setCustomerSearch(event.target.value);
                                setCustomer(event.target.value);
                                setSelectedCustomerId("");
                                setCustomerPickerOpen(true);
                                setError("");
                            }}
                            disabled={loadingCustomers}
                            placeholder={loadingCustomers ? "Loading customers..." : "Search/select customer"}
                        />

                        {customerPickerOpen && !loadingCustomers && (
                            <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-white/10 bg-slate-950 p-1 shadow-2xl shadow-slate-950/60">
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onMouseDown={event => event.preventDefault()}
                                            onClick={() => selectCustomer(item)}
                                            className="flex w-full items-start justify-between gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-200 hover:bg-blue-600/20 focus:bg-blue-600/20 focus:outline-none"
                                        >
                                            <span className="min-w-0">
                                                <span className="block truncate font-semibold text-white">{item.name}</span>
                                                <span className="mt-1 block truncate text-xs text-slate-400">
                                                    #{item.id} {item.email || item.phone || item.address || "No contact details"}
                                                </span>
                                            </span>
                                            <span className="shrink-0 text-xs font-semibold text-blue-300">Select</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="rounded-lg px-4 py-3 text-sm text-slate-300">
                                        <p>No customers found.</p>
                                        <button
                                            type="button"
                                            onMouseDown={event => event.preventDefault()}
                                            onClick={() => {
                                                setShowCustomerCreate(true);
                                                setNewCustomerName(customerSearch);
                                                setCustomerPickerOpen(false);
                                            }}
                                            className="mt-2 inline-flex font-semibold text-blue-300 hover:text-blue-200"
                                        >
                                            Add customer
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {selectedCustomerId && (
                        <p className="mt-2 text-xs font-semibold text-blue-300">
                            Selected customer #{selectedCustomerId}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setShowCustomerCreate(previous => !previous);
                            setNewCustomerName(customerSearch || customer);
                        }}
                        className="mt-2 text-xs font-semibold text-blue-300 hover:text-blue-200"
                    >
                        Add customer
                    </button>
                </Field>

                <Field label="Phone">
                    <TextInput
                        value={phone}
                        onChange={event => setPhone(event.target.value)}
                    />
                </Field>

                <Field label="Job needed">
                    <TextInput
                        value={jobTitle}
                        onChange={event => setJobTitle(event.target.value)}
                        placeholder="Boiler service"
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
                    {showCustomerCreate && (
                        <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-sm font-bold text-white">Add customer</p>
                                    <p className="mt-1 text-xs text-slate-400">Create a customer and select them for this job.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowCustomerCreate(false)}
                                    className="text-xs font-semibold text-slate-300 hover:text-white"
                                >
                                    Close
                                </button>
                            </div>

                            {customerError && (
                                <div className="mt-3 rounded-lg border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-100">
                                    {customerError}
                                </div>
                            )}

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <Field label="New customer name">
                                    <TextInput value={newCustomerName} onChange={event => setNewCustomerName(event.target.value)} />
                                </Field>
                                <Field label="New customer phone">
                                    <TextInput value={newCustomerPhone} onChange={event => setNewCustomerPhone(event.target.value)} />
                                </Field>
                                <Field label="New customer email">
                                    <TextInput type="email" value={newCustomerEmail} onChange={event => setNewCustomerEmail(event.target.value)} />
                                </Field>
                                <Field label="New customer address">
                                    <TextInput value={newCustomerAddress} onChange={event => setNewCustomerAddress(event.target.value)} />
                                </Field>
                                <div className="md:col-span-2">
                                    <Field label="New customer notes">
                                        <TextArea value={newCustomerNotes} onChange={event => setNewCustomerNotes(event.target.value)} rows={3} />
                                    </Field>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={createInlineCustomer}
                                disabled={creatingCustomer}
                                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                            >
                                {creatingCustomer ? "Creating..." : "Create and select customer"}
                            </button>
                        </div>
                    )}
                </div>

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

                <div className="md:col-span-2">
                    <JobQuoteLinkPanel job={editingJob ?? null} onJobChange={onJobChange} />
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
