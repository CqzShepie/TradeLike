import { useEffect, useState } from "react";
import { jobAssignmentsService } from "../services/jobAssignmentsService";
import { jobsService } from "../services/jobsService";
import type { Job } from "../types/job";

export function useWeekJobs(weekStart: Date) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                setLoading(true);
                setError(null);

                const [weekRows, assignmentRows] = await Promise.allSettled([
                    jobsService.getWeek(toLocalDateOnly(weekStart)),
                    jobAssignmentsService.getAll(),
                ]);

                const assignmentMap = new Map(
                    assignmentRows.status === "fulfilled"
                        ? assignmentRows.value.map(assignment => [assignment.jobId, assignment])
                        : []
                );

                const map = new Map<number, Job>();
                if (weekRows.status === "fulfilled") {
                    weekRows.value.forEach(job => map.set(job.id, withAssignmentMeta(job, assignmentMap)));
                } else {
                    throw weekRows.reason;
                }

                if (isMounted) {
                    setJobs(Array.from(map.values()).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()));
                }
            } catch {
                if (isMounted) {
                    setError("Failed to load jobs");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            isMounted = false;
        };
    }, [weekStart]);

    return { jobs, loading, error };
}

function withAssignmentMeta(job: Job, assignmentMap: Map<number, { calendarColour?: string | null; leadStaffMemberId?: number | null; assignedStaffMemberIds: number[] }>) {
    const assignment = assignmentMap.get(job.id);
    if (!assignment) return job;

    return {
        ...job,
        calendarColour: assignment.calendarColour ?? job.calendarColour ?? null,
        engineerId: assignment.leadStaffMemberId ?? assignment.assignedStaffMemberIds[0] ?? job.engineerId ?? null,
    };
}

function toLocalDateOnly(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

