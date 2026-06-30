import { useEffect, useState } from "react";
import type { Job } from "../../types/job";
import type { Engineer } from "../../services/engineersService";
import { accessibilityService } from "../../services/accessibilityService";
import { getTeamColour } from "../../utils/teamColours";
import { MAX_JOBS_PER_DAY, getDayLoad, getEngineerLoadsForDay } from "../../utils/dispatchRules";

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

type LeaveRequest = {
    id: number;
    staffMemberId: number;
    startDate: string;
    endDate: string;
    reason: string;
    status: "Pending" | "Approved" | "Rejected";
};

const leaveStorageKey = "tradelike_staff_leave_requests";

export default function DayColumn({ date, jobs, engineers, onSelectJob, onMoveJob, allJobs }: DayColumnProps) {
    const [accessibility, setAccessibility] = useState(() => accessibilityService.getPreferences());
    const [selectedLeave, setSelectedLeave] = useState<(LeaveRequest & { staffName: string; teamName: string }) | null>(null);
    const dayName = date.toLocaleDateString("en-GB", { weekday: "long" });
    const dayNumber = date.getDate();
    const load = getDayLoad(allJobs, date);
    const engineerLoads = Object.entries(getEngineerLoadsForDay(allJobs, date));
    const leaveItems = getLeaveForDate(date, engineers);

    useEffect(() => accessibilityService.subscribe(setAccessibility), []);

    function getEngineerName(engineerId: number | null | undefined) {
        if (engineerId == null) return "Unassigned";
        return engineers.find(engineer => engineer.id === engineerId)?.name ?? `Engineer ${engineerId}`;
    }

    const cardPadding = accessibility.largeCalendarCards ? "p-3 text-sm" : "p-2 text-xs";

    return (
        <div className="flex min-h-[700px] flex-col border-r border-gray-200 bg-white last:border-r-0" onDragOver={event => event.preventDefault()} onDrop={event => { const jobId = Number(event.dataTransfer.getData("text/plain")); const job = allJobs.find(item => item.id === jobId); if (job) onMoveJob(job, date); }}>
            <div className="border-b border-gray-200 bg-gray-50 p-3">
                <div className="flex justify-between">
                    <div><div className="text-sm font-semibold text-gray-900">{dayName}</div><div className="text-xs text-gray-500">{dayNumber}</div></div>
                    {!accessibility.hideCapacityWarnings && <div className="text-right text-xs font-bold text-gray-700">{load} / {MAX_JOBS_PER_DAY}</div>}
                </div>
                {!accessibility.simplifyCalendar && engineerLoads.length > 0 && <div className="mt-2 space-y-1 text-[10px] text-gray-600">{engineerLoads.map(([id, count]) => <div key={id}>{id === "unassigned" ? "Unassigned" : getEngineerName(Number(id))}: {count}</div>)}</div>}
            </div>

            <div className="flex-1 space-y-2 p-2">
                {leaveItems.map(item => <button key={`leave-${item.id}`} type="button" onClick={() => setSelectedLeave(item)} className={`w-full rounded border border-amber-300 bg-amber-50 text-left shadow-sm ${cardPadding}`} data-calendar-card="true"><div className="font-semibold text-amber-900">Annual leave</div><div className="text-amber-800">{item.staffName}</div>{!accessibility.simplifyCalendar && <div className="mt-1 text-[10px] font-medium text-amber-700">{item.status}{item.reason ? ` · ${item.reason}` : ""}</div>}</button>)}
                {jobs.length === 0 && leaveItems.length === 0 && <p className="text-xs text-gray-400">No jobs</p>}
                {jobs.map(job => {
                    const teamColour = getTeamColour(job.calendarColour);
                    return <button key={job.id} type="button" draggable onDragStart={event => event.dataTransfer.setData("text/plain", String(job.id))} onClick={() => onSelectJob(job)} className={`w-full rounded border text-left shadow-sm transition hover:shadow ${cardPadding}`} data-calendar-card="true" style={{ borderColor: teamColour.hex, backgroundColor: teamColour.softHex }}><div className="font-semibold text-gray-900">{job.jobTitle}</div><div className="text-gray-500">{job.customer}</div>{!accessibility.simplifyCalendar && <div className="mt-2 flex flex-wrap gap-1"><span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">{job.priority}</span><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">{job.status === "InProgress" ? "In Progress" : job.status}</span></div>}{accessibility.calendarTextLabels && job.assignedTeamName && <div className="mt-1 text-[10px] font-semibold" style={{ color: teamColour.hex }}>{job.assignedTeamName}</div>}<div className="mt-1 text-[10px] text-blue-500">{getEngineerName(job.engineerId)}</div></button>;
                })}
            </div>

            {selectedLeave && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"><div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><button type="button" onClick={() => setSelectedLeave(null)} className="absolute right-3 top-3 rounded px-2 text-xl leading-none text-slate-500 hover:bg-slate-100" aria-label="Close annual leave details">×</button><p className="text-xs font-bold uppercase tracking-wide text-amber-700">Annual Leave Management</p><h2 className="mt-1 text-xl font-bold text-slate-900">{selectedLeave.staffName}</h2><dl className="mt-4 space-y-3 text-sm"><Detail label="Staff #ID" value={String(selectedLeave.staffMemberId)} /><Detail label="Team" value={selectedLeave.teamName} /><Detail label="Starts" value={formatDate(selectedLeave.startDate)} /><Detail label="Ends" value={formatDate(selectedLeave.endDate)} /><Detail label="Status" value={selectedLeave.status} /><Detail label="Reason" value={selectedLeave.reason || "No reason added"} /></dl></div></div>}
        </div>
    );
}

function getLeaveForDate(date: Date, engineers: Engineer[]) {
    const target = startOfDay(date).getTime();
    try {
        const rows = JSON.parse(localStorage.getItem(leaveStorageKey) ?? "[]") as LeaveRequest[];
        return rows.filter(row => row.status !== "Rejected" && startOfDay(row.startDate).getTime() <= target && startOfDay(row.endDate).getTime() >= target).map(row => ({ ...row, staffName: engineers.find(engineer => engineer.id === row.staffMemberId)?.name ?? `Staff ${row.staffMemberId}`, teamName: "No team recorded" }));
    } catch { return []; }
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 font-medium text-slate-900">{value}</dd></div>; }
function startOfDay(value: Date | string) { const date = new Date(value); date.setHours(0, 0, 0, 0); return date; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
