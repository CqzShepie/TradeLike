import type { Job } from "../../types/job";

interface JobCardProps {
    job: Job;
}

function getStatusStyles(status: string) {
    switch (status) {
        case "Completed":
            return "border-green-200 bg-green-50 text-green-800";
        case "InProgress":
            return "border-blue-200 bg-blue-50 text-blue-800";
        case "Cancelled":
            return "border-red-200 bg-red-50 text-red-800";
        default:
            return "border-gray-200 bg-white text-gray-900";
    }
}

export default function JobCard({ job }: JobCardProps) {
    const statusStyles = getStatusStyles(job.status);

    function handleDragStart(e: React.DragEvent) {
        e.dataTransfer.setData("job", JSON.stringify(job));
    }

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className={`rounded-md border p-2 shadow-sm cursor-move transition hover:shadow ${statusStyles}`}
        >
            <div className="text-xs font-semibold">{job.jobTitle}</div>
            <div className="text-xs opacity-80">{job.customer}</div>
            <div className="text-[10px] opacity-60">{job.address}</div>
        </div>
    );
}