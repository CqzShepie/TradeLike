import { useState } from "react";
import type { Job } from "../../types/job";
import type { Engineer } from "../../services/engineersService";
import type { CustomerStaffMember, CustomerTeam } from "../../services/customerStaffService";
import type { StaffLeaveRequest } from "../../services/staffLeaveService";
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
    leaveRequests?: StaffLeaveRequest[];
    allJobs: Job[];
    weekDays: Date[];
    intensity?: number;
    isOverloaded?: boolean;
    showStaffDetails?: boolean;
}

export default function DayColumn({ date, jobs, engineers, staffMembers = [], teams = [], onSelectJob, onMoveJob, leaveRequests = [], allJobs, showStaffDetails = true }: DayColumnProps) {
    const [selectedLeave, setSelectedLeave] = useState<(StaffLeaveRequest & { staffName: string; teamName: string }) | null>(null);
    const dayName = date.toLocaleDateString("en-GB", { weekday: "long" });
    const dayNumber = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const load = getDayLoad(allJobs, date);
    const engineerLoads = showStaffDetails ? Object.entries(getEngineerLoadsForDay(allJobs, date)) : [];
    const leaveItems = showStaffDetails ? getLeaveForDate(date, leaveRequests, engineers, staffMembers, teams) : [];

    function getEngineerName(engineerId: number | null | undefined) {
        if (engineerId == null) return "Unassigned";
        return engineers.find(engineer => engineer.id === engineerId)?.name ?? `Engineer ${engineerId}`;
    }

    return (
        <div className="flex min-h-[700px] flex-col border-r border-white/10 bg-slate-950/40 last:border-r-0" onDragOver={event => event.preventDefault()} onDrop={event => { const jobId = Number(event.dataTransfer.getData("text/plain")); const job = allJobs.find(item => item.id === jobId); if (job) onMoveJob(job, date); }}>
            <div className="border-b border-white/10 bg-white/[0.03] p-3">
                <div className="flex justify-between"><div><div className="text-sm font-semibold text-white">{dayName}</div><div className="text-xs text-slate-400">{dayNumber}</div></div><div className="text-right text-xs font-bold text-slate-300">{load} {load === 1 ? "job" : "jobs"}</div></div>
                {engineerLoads.length > 0 && <div className="mt-2 space-y-1 text-[10px] text-slate-400">{engineerLoads.map(([id, count]) => <div key={id}>{id === "unassigned" ? "Unassigned" : getEngineerName(Number(id))}: {count}</div>)}</div>}
            </div>
            <div className="flex-1 space-y-2 p-2">
                {leaveItems.map(item => <button key={`leave-${item.id}`} type="button" onClick={() => setSelectedLeave(item)} className="w-full rounded border border-amber-300 bg-amber-50 p-2 text-left text-xs shadow-sm"><div className="font-semibold text-amber-900">Annual leave</div><div className="text-amber-800">{item.staffName}</div><div className="text-[10px] text-amber-700">{item.status}</div></button>)}
                {jobs.length === 0 && leaveItems.length === 0 && <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-3 text-xs text-slate-500">No jobs</p>}
                {jobs.map(job => { const teamColour = getTeamColour(job.calendarColour); return <button key={job.id} type="button" draggable onDragStart={event => event.dataTransfer.setData("text/plain", String(job.id))} onClick={() => onSelectJob(job)} className="w-full rounded-lg border p-2 text-left text-xs shadow-sm transition hover:shadow-lg" data-calendar-card="true" style={{ borderColor: teamColour.hex, backgroundColor: teamColour.softHex }}><div className="font-semibold text-slate-950">{job.jobTitle}</div><div className="text-slate-600">{job.customer}</div>{showStaffDetails && <div className="mt-1 text-[10px] font-semibold text-blue-700">{getEngineerName(job.engineerId)}</div>}</button>; })}
            </div>
            {selectedLeave && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"><div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><button type="button" onClick={() => setSelectedLeave(null)} className="absolute right-3 top-3 rounded px-2 text-xl leading-none text-slate-500 hover:bg-slate-100">×</button><p className="text-xs font-bold uppercase tracking-wide text-amber-700">Annual Leave Management</p><h2 className="mt-1 text-xl font-bold text-slate-900">{selectedLeave.staffName}</h2><div className="mt-4 space-y-3 text-sm"><Detail label="Staff #ID" value={String(selectedLeave.staffMemberId)} /><Detail label="Team" value={selectedLeave.teamName} /><Detail label="Starts" value={formatDate(selectedLeave.startDate)} /><Detail label="Ends" value={formatDate(selectedLeave.endDate)} /><Detail label="Status" value={selectedLeave.status} /><Detail label="Reason" value={selectedLeave.reason || "No reason added"} /></div></div></div>}
        </div>
    );
}

function getLeaveForDate(date: Date, leaveRequests: StaffLeaveRequest[], engineers: Engineer[], staffMembers: CustomerStaffMember[], teams: CustomerTeam[]) { const target = startOfDay(date).getTime(); return leaveRequests.filter(row => row.status !== "Rejected" && startOfDay(row.startDate).getTime() <= target && startOfDay(row.endDate).getTime() >= target).map(row => { const staff = staffMembers.find(member => member.id === row.staffMemberId); const team = staff?.teamIds?.[0] ? teams.find(item => item.id === staff.teamIds[0]) : null; return { ...row, staffName: staff ? `${staff.firstName} ${staff.lastName}` : engineers.find(engineer => engineer.id === row.staffMemberId)?.name ?? `Staff ${row.staffMemberId}`, teamName: team?.name ?? "No Team Recorded" }; }); }
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-medium text-slate-900">{value}</p></div>; }
function startOfDay(value: Date | string) { const date = new Date(value); date.setHours(0, 0, 0, 0); return date; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
