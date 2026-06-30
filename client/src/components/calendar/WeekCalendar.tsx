import { useEffect, useMemo, useState } from "react";
import WeekGrid from "./WeekGrid";
import WeekNavigation from "./WeekNavigation";
import { useWeekJobs } from "../../hooks/useWeekJobs";
import { jobsService } from "../../services/jobsService";
import { customerStaffService } from "../../services/customerStaffService";
import type { CustomerStaffMember, CustomerTeam } from "../../services/customerStaffService";
import { jobAssignmentsService } from "../../services/jobAssignmentsService";
import type { JobAssignment } from "../../services/jobAssignmentsService";
import type { Engineer } from "../../services/engineersService";
import { getLeastLoadedEngineer } from "../../utils/engineerDispatch";
import { moveJobToDay } from "../../utils/dispatchRules";
import type { Job } from "../../types/job";

export default function WeekCalendar() {
    const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date()));
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [members, setMembers] = useState<CustomerStaffMember[]>([]);
    const [teams, setTeams] = useState<CustomerTeam[]>([]);
    const [assignments, setAssignments] = useState<JobAssignment[]>([]);
    const [selectedCalendar, setSelectedCalendar] = useState("all");
    const [optimisticJobs, setOptimisticJobs] = useState<Job[]>([]);
    const { jobs: serverJobs } = useWeekJobs(currentWeek);

    useEffect(() => {
        let cancelled = false;
        Promise.all([customerStaffService.getWorkspace(), jobAssignmentsService.getAll()]).then(([workspace, assignmentRows]) => {
            if (cancelled) return;
            setMembers(workspace.members.filter(member => member.status !== "Left"));
            setTeams(workspace.teams);
            setAssignments(assignmentRows);
        }).catch(() => {
            if (cancelled) return;
            setMembers([]);
            setTeams([]);
            setAssignments([]);
        });
        return () => { cancelled = true; };
    }, []);

    const engineers: Engineer[] = useMemo(() => members.map(member => ({ id: member.id, name: `${member.firstName} ${member.lastName}`, email: member.email, phone: member.phone })), [members]);
    const assignmentMap = useMemo(() => new Map(assignments.map(item => [item.jobId, item])), [assignments]);

    const mergedJobs = useMemo(() => {
        const map = new Map<number, Job>();
        serverJobs.forEach(job => map.set(job.id, job));
        optimisticJobs.forEach(job => map.set(job.id, job));
        return Array.from(map.values()).map(job => {
            const assignment = assignmentMap.get(job.id);
            const firstAssignedStaff = assignment?.assignedStaffMemberIds[0] ?? null;
            return { ...job, engineerId: assignment?.leadStaffMemberId ?? firstAssignedStaff ?? job.engineerId ?? null };
        });
    }, [assignmentMap, serverJobs, optimisticJobs]);

    const jobs = useMemo(() => {
        if (selectedCalendar === "all") return mergedJobs;
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
    }, [assignmentMap, mergedJobs, selectedCalendar]);

    useEffect(() => { setOptimisticJobs([]); }, [currentWeek]);

    async function handleMoveJob(job: Job, newDate: Date) {
        const confirmed = confirm(`Move ${job.jobTitle} to ${newDate.toLocaleDateString("en-GB")}?`);
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
        try { await jobsService.update(updatedJob); } catch { setOptimisticJobs([]); }
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

    return <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"><WeekNavigation weekLabel={weekLabel} onPreviousWeek={handlePreviousWeek} onCurrentWeek={handleCurrentWeek} onNextWeek={handleNextWeek} /><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-2"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dispatch View</div><select className="rounded border border-gray-300 px-2 py-1 text-xs" value={selectedCalendar} onChange={event => setSelectedCalendar(event.target.value)}><option value="all">Merged: everyone</option><option value="unassigned">Unassigned jobs</option>{members.map(member => <option key={member.id} value={`staff:${member.id}`}>{member.firstName} {member.lastName}</option>)}{teams.map(team => <option key={team.id} value={`team:${team.id}`}>Team: {team.name}</option>)}</select></div><WeekGrid weekStart={currentWeek} jobs={jobs} engineers={engineers} onSelectJob={setSelectedJob} onMoveJob={handleMoveJob} />{selectedJob && <div className="absolute right-0 top-0 h-full w-80 border-l border-gray-200 bg-white p-4"><button type="button" onClick={() => setSelectedJob(null)} className="absolute right-3 top-3 rounded px-2 text-xl leading-none text-gray-500 hover:bg-gray-100" aria-label="Close job details">×</button><div className="pr-8 text-sm font-semibold">{selectedJob.jobTitle}</div><div className="mt-2 text-xs text-gray-600">{selectedJob.customer}</div><div className="mt-4 text-xs text-gray-500">{selectedJob.address}</div></div>}</div>;
}

function startOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
}
