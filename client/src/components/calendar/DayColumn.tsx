import type { Job } from "../../types/job";
import type { Engineer } from "../../services/engineersService";
import type { CustomerStaffMember, CustomerTeam } from "../../services/customerStaffService";
import { getTeamColour } from "../../utils/teamColours";
import { getDayLoad, getEngineerLoadsForDay } from "../../utils/dispatchRules";

interface DayColumnProps {
    date: Date;
    jobs: Job[];
    engineers: Engineer[];
    staffMembers?: CustomerStaffMember[];
    teams?: CustomerTeam[];
    onSelectJob: (job: Job) => void;
    onMoveJob: (job: Job, newDate: Date) => void;
    allJobs: Job[];
    weekDays: Date[];
    intensity?: number;
    isOverloaded?: boolean;
}

export default function DayColumn({ date, jobs, engineers, onSelectJob, onMoveJob, allJobs }: DayColumnProps) {
    const dayName = date.toLocaleDateString("en-GB", { weekday: "long" });
    const dayNumber = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const load = getDayLoad(allJobs, date);
    const engineerLoads = Object.entries(getEngineerLoadsForDay(allJobs, date));

    function getEngineerName(engineerId: number | null | undefined) {
        if (engineerId == null) return "Unassigned";
        return engineers.find(engineer => engineer.id === engineerId)?.name ?? `Engineer ${engineerId}`;
    }

    return (
        <div className="flex min-h-[700px] flex-col border-r border-gray-200 bg-white last:border-r-0" onDragOver={event => event.preventDefault()} onDrop={event => { const jobId = Number(event.dataTransfer.getData("text/plain")); const job = allJobs.find(item => item.id === jobId); if (job) onMoveJob(job, date); }}>
            <div className="border-b border-gray-200 bg-gray-50 p-3">
                <div className="flex justify-between">
                    <div><div className="text-sm font-semibold text-gray-900">{dayName}</div><div className="text-xs text-gray-500">{dayNumber}</div></div>
                    <div className="text-right text-xs font-bold text-gray-700">{load} {load === 1 ? "job" : "jobs"}</div>
                </div>
                {engineerLoads.length > 0 && <div className="mt-2 space-y-1 text-[10px] text-gray-600">{engineerLoads.map(([id, count]) => <div key={id}>{id === "unassigned" ? "Unassigned" : getEngineerName(Number(id))}: {count}</div>)}</div>}
            </div>
            <div className="flex-1 space-y-2 p-2">
                {jobs.length === 0 && <p className="text-xs text-gray-400">No jobs</p>}
                {jobs.map(job => {
                    const teamColour = getTeamColour(job.calendarColour);
                    return <button key={job.id} type="button" draggable onDragStart={event => event.dataTransfer.setData("text/plain", String(job.id))} onClick={() => onSelectJob(job)} className="w-full rounded border p-2 text-left text-xs shadow-sm transition hover:shadow" data-calendar-card="true" style={{ borderColor: teamColour.hex, backgroundColor: teamColour.softHex }}><div className="font-semibold text-gray-900">{job.jobTitle}</div><div className="text-gray-500">{job.customer}</div><div className="mt-1 text-[10px] text-blue-500">{getEngineerName(job.engineerId)}</div></button>;
                })}
            </div>
        </div>
    );
}
