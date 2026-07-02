import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import WeekGrid from "./WeekGrid";
import WeekNavigation from "./WeekNavigation";
import RouteMapModal from "./RouteMapModal";
import { SelectMenu } from "../ui";
import { useWeekJobs } from "../../hooks/useWeekJobs";
import { jobsService } from "../../services/jobsService";
import { customerStaffService } from "../../services/customerStaffService";
import type { CustomerStaffMember, CustomerTeam } from "../../services/customerStaffService";
import { staffLeaveService } from "../../services/staffLeaveService";
import type { StaffLeaveRequest } from "../../services/staffLeaveService";
import { jobAssignmentsService } from "../../services/jobAssignmentsService";
import type { JobAssignment } from "../../services/jobAssignmentsService";
import type { Engineer } from "../../services/engineersService";
import { useAuth } from "../../hooks/useAuth";
import { canUseStaffScheduling } from "../../routes/planEntitlements";
import { getLeastLoadedEngineer } from "../../utils/engineerDispatch";
import { moveJobToDay, toDateKey } from "../../utils/dispatchRules";
import type { Job } from "../../types/job";

export default function WeekCalendar() {
    const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date()));
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [members, setMembers] = useState<CustomerStaffMember[]>([]);
    const [teams, setTeams] = useState<CustomerTeam[]>([]);
    const [assignments, setAssignments] = useState<JobAssignment[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<StaffLeaveRequest[]>([]);
    const [selectedCalendar, setSelectedCalendar] = useState("all");
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [optimisticJobs, setOptimisticJobs] = useState<Job[]>([]);
    const { jobs: serverJobs } = useWeekJobs(currentWeek);
    const { user } = useAuth();
    const showStaffScheduling = canUseStaffScheduling(user);

    useEffect(() => {
        if (!showStaffScheduling) {
            setMembers([]);
            setTeams([]);
            setAssignments([]);
            setLeaveRequests([]);
            return;
        }

        let cancelled = false;
        Promise.all([customerStaffService.getWorkspace(), jobAssignmentsService.getAll(), staffLeaveService.getAll()]).then(([workspace, assignmentRows, leaveRows]) => {
            if (cancelled) return;
            setMembers(workspace.members.filter(member => member.status === "Active"));
            setTeams(workspace.teams);
            setAssignments(assignmentRows);
            setLeaveRequests(leaveRows);
        }).catch(() => {
            if (cancelled) return;
            setMembers([]);
            setTeams([]);
            setAssignments([]);
            setLeaveRequests([]);
        });
        return () => { cancelled = true; };
    }, [showStaffScheduling]);

    useEffect(() => {
        if (!showStaffScheduling && selectedCalendar !== "all") {
            setSelectedCalendar("all");
        }
    }, [showStaffScheduling, selectedCalendar]);

    const engineers: Engineer[] = useMemo(() => members.map(member => ({ id: member.id, name: `${member.firstName} ${member.lastName}`, email: member.email, phone: member.phone })), [members]);
    const assignmentMap = useMemo(() => new Map(assignments.map(item => [item.jobId, item])), [assignments]);

    const mergedJobs = useMemo(() => {
        const map = new Map<number, Job>();
        serverJobs.forEach(job => map.set(job.id, job));
        optimisticJobs.forEach(job => map.set(job.id, job));
        return Array.from(map.values()).map(job => {
            const assignment = assignmentMap.get(job.id);
            const firstAssignedStaff = assignment?.assignedStaffMemberIds[0] ?? null;
            const engineerId = assignment
                ? assignment.leadStaffMemberId ?? firstAssignedStaff ?? null
                : job.engineerId ?? null;
            return { ...job, engineerId };
        });
    }, [assignmentMap, serverJobs, optimisticJobs]);

    const jobs = useMemo(() => {
        if (!showStaffScheduling || selectedCalendar === "all") return mergedJobs;
        if (selectedCalendar === "unassigned") return mergedJobs.filter(job => {
            const assignment = assignmentMap.get(job.id);
            return !assignment || (!assignment.assignedTeamId && !assignment.leadStaffMemberId && assignment.assignedStaffMemberIds.length === 0);
        });
        if (selectedCalendar.startsWith("staff:")) {
            const staffId = Number(selectedCalendar.replace("staff:", ""));
            return mergedJobs.filter(job => {
                const assignment = assignmentMap.get(job.id);
                return assignment?.leadStaffMemberId === staffId || assignment?.assignedStaffMemberIds.includes(staffId) || job.engineerId === staffId;
            });
        }
        if (selectedCalendar.startsWith("team:")) {
            const teamId = Number(selectedCalendar.replace("team:", ""));
            return mergedJobs.filter(job => assignmentMap.get(job.id)?.assignedTeamId === teamId);
        }
        return mergedJobs;
    }, [assignmentMap, showStaffScheduling, mergedJobs, selectedCalendar]);

    useEffect(() => { setOptimisticJobs([]); }, [currentWeek]);

    async function handleMoveJob(job: Job, newDate: Date) {
        if (toDateKey(job.scheduledDate) === toDateKey(newDate)) return;
        const confirmed = confirm(`Move ${job.jobTitle} to ${newDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}?`);
        if (!confirmed) return;
        let updatedJob: Job = moveJobToDay(job, newDate);
        if (updatedJob.engineerId == null && engineers.length > 0) {
            const bestEngineerId = getLeastLoadedEngineer(engineers, mergedJobs);
            if (bestEngineerId !== null) updatedJob = { ...updatedJob, engineerId: bestEngineerId };
        }
        setOptimisticJobs(previousJobs => {
            const map = new Map<number, Job>();
            [...mergedJobs, ...previousJobs].forEach(existingJob => map.set(existingJob.id, existingJob));
            map.set(job.id, updatedJob);
            return Array.from(map.values());
        });
        try {
            const saved = await jobsService.update(updatedJob);
            setOptimisticJobs(previousJobs => {
                const map = new Map<number, Job>();
                [...previousJobs, saved].forEach(existingJob => map.set(existingJob.id, existingJob));
                return Array.from(map.values());
            });
        } catch {
            setOptimisticJobs(previousJobs => previousJobs.filter(existingJob => existingJob.id !== job.id));
            toast.error("Could not move the job. It has been returned to its original date.");
        }
    }

    async function updateJobLead(job: Job, memberId: number | null) {
        const current = assignmentMap.get(job.id);
        try {
            const updated = await jobAssignmentsService.update(job.id, {
                assignedTeamId: current?.assignedTeamId ?? null,
                leadStaffMemberId: memberId,
                assignedStaffMemberIds: (current?.assignedStaffMemberIds ?? []).filter(id => id !== memberId),
                scheduledEndDate: current?.scheduledEndDate ?? null,
                calendarColour: current?.calendarColour ?? job.calendarColour ?? "blue",
            });
            setAssignments(updated);
            toast.success(memberId ? "Job assignment updated." : "Job unassigned.");
        } catch {
            toast.error("Could not update the job assignment.");
        }
    }

    const weekLabel = useMemo(() => {
        const end = new Date(currentWeek);
        end.setDate(end.getDate() + 6);
        const startMonth = currentWeek.toLocaleDateString("en-GB", { month: "long" });
        const endMonth = end.toLocaleDateString("en-GB", { month: "long" });
        const startYear = currentWeek.getFullYear();
        const endYear = end.getFullYear();
        if (startMonth === endMonth && startYear === endYear) return `${currentWeek.getDate()} - ${end.getDate()} ${endMonth} ${endYear}`;
        return `${currentWeek.getDate()} ${startMonth} ${startYear} - ${end.getDate()} ${endMonth} ${endYear}`;
    }, [currentWeek]);

    function handlePreviousWeek() { setCurrentWeek(previous => { const date = new Date(previous); date.setDate(date.getDate() - 7); return startOfWeek(date); }); }
    function handleCurrentWeek() { setCurrentWeek(startOfWeek(new Date())); }
    function handleNextWeek() { setCurrentWeek(previous => { const date = new Date(previous); date.setDate(date.getDate() + 7); return startOfWeek(date); }); }

    const selectedEngineerId = selectedCalendar.startsWith("staff:") ? Number(selectedCalendar.replace("staff:", "")) : null;
    const calendarOptions = [
        { value: "all", label: "Merged: everyone" },
        ...(showStaffScheduling ? [{ value: "unassigned", label: "Unassigned jobs" }] : []),
        ...(showStaffScheduling ? members.map(member => ({ value: `staff:${member.id}`, label: `${member.firstName} ${member.lastName}` })) : []),
        ...(showStaffScheduling ? teams.map(team => ({ value: `team:${team.id}`, label: `Team: ${team.name}` })) : []),
    ];

    return (
        <div className="relative overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-slate-950/20">
            <WeekNavigation
                weekLabel={weekLabel}
                onPreviousWeek={handlePreviousWeek}
                onCurrentWeek={handleCurrentWeek}
                onNextWeek={handleNextWeek}
            />
            <div className="flex flex-wrap items-center justify-end gap-3 border-b border-white/10 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                    {showStaffScheduling && (
                        <button
                            type="button"
                            onClick={() => setShowRouteModal(true)}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                        >
                            Optimise Route
                        </button>
                    )}
                    {showStaffScheduling && (
                        <SelectMenu
                            ariaLabel="Calendar dispatch filter"
                            value={selectedCalendar}
                            onChange={setSelectedCalendar}
                            options={calendarOptions}
                            buttonClassName="px-3 py-2 text-xs"
                        />
                    )}
                </div>
            </div>
            <WeekGrid
                weekStart={currentWeek}
                jobs={jobs}
                engineers={showStaffScheduling ? engineers : []}
                staffMembers={showStaffScheduling ? members : []}
                teams={showStaffScheduling ? teams : []}
                leaveRequests={showStaffScheduling ? leaveRequests : []}
                showStaffDetails={showStaffScheduling}
                onSelectJob={setSelectedJob}
                onMoveJob={handleMoveJob}
            />
            {showStaffScheduling && showRouteModal && (
                <RouteMapModal
                    date={currentWeek}
                    engineerId={selectedEngineerId}
                    onClose={() => setShowRouteModal(false)}
                />
            )}
            {selectedJob && (() => {
                const selectedAssignment = assignmentMap.get(selectedJob.id);
                const selectedTeam = teams.find(team => team.id === selectedAssignment?.assignedTeamId);
                const leadEngineerId = selectedAssignment ? selectedAssignment.leadStaffMemberId : selectedJob.engineerId;
                const leadEngineer = members.find(member => member.id === leadEngineerId);
                const extraStaff = members.filter(member => selectedAssignment?.assignedStaffMemberIds.includes(member.id));
                const detailRows = [
                    ["Job number", `#${selectedJob.jobNumber ?? selectedJob.id}`],
                    ["Customer", selectedJob.customer],
                    ["Date and time", formatDateTime(selectedJob.scheduledDate)],
                    ["Phone", selectedJob.phone || "Not recorded"],
                    ["Address", selectedJob.address || "Not recorded"],
                    ["Status", selectedJob.status === "InProgress" ? "In Progress" : selectedJob.status],
                    ["Priority", selectedJob.priority],
                    ["Linked quote", selectedJob.quoteId ? `Quote #${selectedJob.quoteId}` : "No quote linked"],
                    ...(showStaffScheduling ? [
                        ["Lead Engineer", leadEngineer ? `${leadEngineer.firstName} ${leadEngineer.lastName}` : "Unassigned"],
                        ["Extra staff", extraStaff.length ? extraStaff.map(member => `${member.firstName} ${member.lastName}`).join(", ") : "No extra staff"],
                        ["Team", selectedTeam?.name ?? selectedJob.assignedTeamName ?? "No team recorded"],
                    ] : []),
                ];

                return (
                    <div className="absolute right-0 top-0 h-full w-96 overflow-y-auto border-l border-white/10 bg-slate-950 p-4 shadow-2xl shadow-slate-950/40">
                        <button
                            type="button"
                            onClick={() => setSelectedJob(null)}
                            className="absolute right-3 top-3 rounded px-2 text-xl leading-none text-slate-400 hover:bg-white/10"
                            aria-label="Close job details"
                        >
                            x
                        </button>
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-300">Job Details</p>
                        <h2 className="mt-1 pr-8 text-lg font-bold text-white">{selectedJob.jobTitle}</h2>
                        <div className="mt-5 space-y-3 text-sm">
                            {detailRows.map(([label, value]) => (
                                <div key={label}>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                                    <p className="mt-1 font-medium text-slate-100">{value}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <Link to={`/jobs/${selectedJob.id}`} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500">
                                View job
                            </Link>
                            {selectedJob.quoteId && (
                                <Link to={`/quotes/${selectedJob.quoteId}`} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10">
                                    View quote
                                </Link>
                            )}
                        </div>
                        {showStaffScheduling && (
                            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="calendar-job-lead">
                                    Change assignment
                                </label>
                                <select
                                    id="calendar-job-lead"
                                    value={selectedAssignment ? selectedAssignment.leadStaffMemberId ?? "" : selectedJob.engineerId ?? ""}
                                    onChange={event => void updateJobLead(selectedJob, event.target.value ? Number(event.target.value) : null)}
                                    className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                                >
                                    <option value="">Unassigned</option>
                                    {members.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}

function formatDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not scheduled";
    return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function startOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
}



