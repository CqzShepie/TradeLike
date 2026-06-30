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

export default function DayColumn({ date, jobs, engineers, onSelectJob, allJobs }: DayColumnProps) {
    const [accessibility, setAccessibility] = useState(() => accessibilityService.getPreferences());
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
        <div className="flex min-h-[700px] flex-col border-r border-gray-200 bg-white last:border-r-0">
            <div className="border-b border-gray-200 bg-gray-50 p-3">
                <div className="flex justify-between">
                    <div>
                        <div className="text-sm font-semibold text-gray-900">{dayName}</div>
                        <div className="text-xs text-gray-500">{dayNumber}</div>
                    </div>
                    {!accessibility.hideCapacityWarnings && <div className="text-right text-xs font-bold text-gray-700">{load} / {MAX_JOBS_PER_DAY}</div>}
                </div>
                {!accessibility.simplifyCalendar && engineerLoads.length > 0 && <div className="mt-2 space-y-1 text-[10px] text-gray-600">{engineerLoads.map(([id, count]) => <div key={id}>{id === "unassigned" ? "Unassigned" : getEngineerName(Number(id))}: {count}</div>)}</div>}
            </div>

            <div className="flex-1 space-y-2 p-2">
                {leaveItems.map(item => <div key={`leave-${item.id}`} className={`rounded border border-amber-300 bg-amber-50 shadow-sm ${cardPadding}`} data-calendar-card="true"><div className="font-semibold text-amber-900">Annual leave</div><div className="text-amber-800">{item.staffName}</div>{!accessibility.simplifyCalendar && <div className="mt-1 text-[10px] font-medium text-amber-700">{item.status}{item.reason ? ` · ${item.reason}` : ""}</div>}</div>)}
                {jobs.length === 0 && leaveItems.length === 0 && <p className="text-xs text-gray-400">No jobs</p>}
                {jobs.map(job => {
                    const teamColour = getTeamColour(job.calendarColour);
                    return <button key={job.id} type="button" onClick={() => onSelectJob(job)} className={`w-full rounded border text-left shadow-sm transition hover:shadow ${cardPadding}`} data-calendar-card="true" style={{ borderColor: teamColour.hex, backgroundColor: teamColour.softHex }}><div className="font-semibold text-gray-900">{job.jobTitle}</div><div className="text-gray-500">{job.customer}</div>{!accessibility.simplifyCalendar && <div className="mt-2 flex flex-wrap gap-1"><span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">{job.priority}</span><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">{job.status === "InProgress" ? "In Progress" : job.status}</span></div>}{accessibility.calendarTextLabels && job.assignedTeamName && <div className="mt-1 text-[10px] font-semibold" style={{ color: teamColour.hex }}>{job.assignedTeamName}</div>}<div className="mt-1 text-[10px] text-blue-500">{getEngineerName(job.engineerId)}</div></button>;
                })}
            </div>
        </div>
    );
}

function getLeaveForDate(date: Date, engineers: Engineer[]) {
    const target = startOfDay(date).getTime();
    try {
        const rows = JSON.parse(localStorage.getItem(leaveStorageKey) ?? "[]") as LeaveRequest[];
        return rows.filter(row => row.status !== "Rejected" && startOfDay(row.startDate).getTime() <= target && startOfDay(row.endDate).getTime() >= target).map(row => ({ ...row, staffName: engineers.find(engineer => engineer.id === row.staffMemberId)?.name ?? `Staff ${row.staffMemberId}` }));
    } catch {
        return [];
    }
}

function startOfDay(value: Date | string) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}
