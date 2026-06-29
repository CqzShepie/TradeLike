import type { DragEvent } from "react";
import type { Job } from "../../types/job";
import type { Engineer } from "../../services/engineersService";
import {
    MAX_JOBS_PER_DAY,
    MAX_JOBS_PER_ENGINEER_PER_DAY,
    isDayOverloaded,
    getDayLoad,
    suggestBetterDay,
    getEngineerLoadsForDay,
    isEngineerOverloaded,
    isMovableJob
} from "../../utils/dispatchRules";

interface DayColumnProps {
    date: Date;
    jobs: Job[];
    engineers: Engineer[];
    onSelectJob: (job: Job) => void;
    onMoveJob: (job: Job, newDate: Date) => void;

    allJobs: Job[];
    weekDays: Date[];

    intensity?: number;
    isOverloaded?: boolean;
}

export default function DayColumn({
    date,
    jobs,
    engineers,
    onSelectJob,
    onMoveJob,
    allJobs,
    weekDays,
    intensity = 0,
    isOverloaded: isOverloadedProp
}: DayColumnProps) {
    const dayName = date.toLocaleDateString("en-GB", {
        weekday: "long",
    });

    const dayNumber = date.getDate();

    const overloaded = isOverloadedProp ?? isDayOverloaded(allJobs, date);
    const load = getDayLoad(allJobs, date);

    const engineerLoadMap = getEngineerLoadsForDay(allJobs, date);

    const engineerLoadEntries = Object.entries(engineerLoadMap)
        .sort(([a], [b]) => {
            if (a === "unassigned") return 1;
            if (b === "unassigned") return -1;

            return Number(a) - Number(b);
        });

    function getEngineerName(engineerId: number | null | undefined) {
        if (engineerId == null) {
            return "Unassigned";
        }

        return engineers.find(engineer => engineer.id === engineerId)?.name
            ?? `Engineer ${engineerId}`;
    }

    function getEngineerLoadLabel(engineerKey: string) {
        if (engineerKey === "unassigned") {
            return "Unassigned";
        }

        return getEngineerName(Number(engineerKey));
    }

    function getStatusLabel(job: Job) {
        switch (job.status) {
            case "InProgress":
                return "In Progress";
            default:
                return job.status;
        }
    }

    function getPriorityClass(job: Job) {
        switch (job.priority) {
            case "Urgent":
                return "bg-red-100 text-red-700";
            case "High":
                return "bg-orange-100 text-orange-700";
            case "Low":
                return "bg-gray-100 text-gray-600";
            default:
                return "bg-blue-100 text-blue-700";
        }
    }

    function getStatusClass(job: Job) {
        switch (job.status) {
            case "Completed":
                return "bg-green-100 text-green-700";
            case "Cancelled":
                return "bg-gray-200 text-gray-600";
            case "InProgress":
                return "bg-yellow-100 text-yellow-700";
            default:
                return "bg-slate-100 text-slate-700";
        }
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();

        const jobData = event.dataTransfer.getData("job");
        if (!jobData) return;

        let job: Job;

        try {
            job = JSON.parse(jobData) as Job;
        } catch {
            return;
        }

        if (!isMovableJob(job)) {
            alert("Only scheduled jobs can be moved.");
            return;
        }

        const suggestion = suggestBetterDay(allJobs, date, weekDays);

        if (suggestion && overloaded) {
            const confirmMove = confirm(
                "This day is full. Move this job to a better available day?"
            );

            if (!confirmMove) return;

            onMoveJob(job, suggestion);
            return;
        }

        if (overloaded) {
            const confirmMove = confirm(
                "This day is already full. Do you still want to place this job here?"
            );

            if (!confirmMove) return;
        }

        onMoveJob(job, date);
    }

    return (
        <div
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            className={`flex min-h-[700px] flex-col border-r border-gray-200 last:border-r-0 ${
                overloaded ? "bg-red-50" : ""
            }`}
            style={{
                backgroundColor:
                    intensity > 0
                        ? `rgba(239, 68, 68, ${Math.min(intensity, 0.18)})`
                        : undefined
            }}
        >
            <div className="border-b border-gray-200 bg-gray-50 p-3">
                <div className="flex justify-between">
                    <div>
                        <div className="text-sm font-semibold text-gray-900">
                            {dayName}
                        </div>

                        <div className="text-xs text-gray-500">
                            {dayNumber}
                        </div>
                    </div>

                    <div className="text-right">
                        <div
                            className={`text-xs font-bold ${
                                overloaded ? "text-red-600" : "text-gray-700"
                            }`}
                        >
                            {load} / {MAX_JOBS_PER_DAY}
                        </div>

                        {overloaded && (
                            <div className="text-[10px] font-bold text-red-600">
                                FULL
                            </div>
                        )}
                    </div>
                </div>

                {engineerLoadEntries.length > 0 && (
                    <div className="mt-2 space-y-1 text-[10px] text-gray-600">
                        {engineerLoadEntries.map(([id, count]) => {
                            const engineerIsFull =
                                id !== "unassigned" &&
                                isEngineerOverloaded(allJobs, date, Number(id));

                            return (
                                <div
                                    key={id}
                                    className={
                                        engineerIsFull
                                            ? "font-semibold text-red-600"
                                            : ""
                                    }
                                >
                                    {getEngineerLoadLabel(id)}: {count}
                                    {engineerIsFull
                                        ? ` / ${MAX_JOBS_PER_ENGINEER_PER_DAY} FULL`
                                        : ""}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex-1 space-y-2 p-2">
                {jobs.length === 0 ? (
                    <p className="text-xs text-gray-400">No jobs</p>
                ) : (
                    jobs.map(job => {
                        const movable = isMovableJob(job);

                        return (
                            <div
                                key={job.id}
                                draggable={movable}
                                onDragStart={(event) => {
                                    if (!movable) {
                                        event.preventDefault();
                                        return;
                                    }

                                    event.dataTransfer.setData(
                                        "job",
                                        JSON.stringify(job)
                                    );
                                }}
                                onClick={() => onSelectJob(job)}
                                className={`rounded border bg-white p-2 text-xs shadow-sm transition hover:shadow ${
                                    movable
                                        ? "cursor-move"
                                        : "cursor-not-allowed opacity-70"
                                }`}
                            >
                                <div className="font-semibold text-gray-900">
                                    {job.jobTitle}
                                </div>

                                <div className="text-gray-500">
                                    {job.customer}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1">
                                    <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getPriorityClass(job)}`}
                                    >
                                        {job.priority}
                                    </span>

                                    <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getStatusClass(job)}`}
                                    >
                                        {getStatusLabel(job)}
                                    </span>
                                </div>

                                <div className="mt-1 text-[10px] text-blue-500">
                                    {getEngineerName(job.engineerId)}
                                </div>

                                {!movable && (
                                    <div className="mt-1 text-[10px] font-medium text-gray-500">
                                        Locked
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}