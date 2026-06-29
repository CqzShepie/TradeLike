import Card from "../../ui/Card";
import type { Job } from "../../../types/job";

type JobInformationCardProps = {
  job: Job;
};

function JobInformationCard({ job }: JobInformationCardProps) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold text-slate-900">
        Job Information
      </h2>

      <div className="space-y-3 text-sm">
        <InfoRow label="Status" value={formatStatus(job.status)} />
        <InfoRow label="Priority" value={job.priority} />
        <InfoRow label="Scheduled" value={formatDateTime(job.scheduledDate)} />
        <InfoRow label="Address" value={job.address || "No address set"} />
      </div>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function formatDateTime(value: string) {
  if (!value) {
    return "No date set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No date set";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(value: Job["status"]) {
  return value === "InProgress" ? "In Progress" : value;
}

export default JobInformationCard;