import type { Job } from "../types/job";

export const MAX_JOBS_PER_DAY = 5;
export const MAX_JOBS_PER_ENGINEER_PER_DAY = 3;

export type DayLoadLevel = "ok" | "warning" | "full";

export type EngineerLike = {
    id: number;
};

export function toDateKey(value: Date | string) {
    const date = value instanceof Date ? value : new Date(value);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export function isMovableJob(job: Job) {
    return job.status === "Scheduled";
}

function getPriorityMoveWeight(job: Job) {
    switch (job.priority) {
        case "Low":
            return 1;
        case "Normal":
            return 2;
        case "High":
            return 3;
        case "Urgent":
            return 4;
        default:
            return 2;
    }
}

export function moveJobToDay(job: Job, targetDay: Date): Job {
    const existingDate = new Date(job.scheduledDate);
    const newDate = new Date(targetDay);

    newDate.setHours(
        existingDate.getHours(),
        existingDate.getMinutes(),
        existingDate.getSeconds(),
        existingDate.getMilliseconds()
    );

    return {
        ...job,
        scheduledDate: toLocalDateTimeValue(newDate)
    };
}

export function getJobsForDay(jobs: Job[], date: Date) {
    const dateKey = toDateKey(date);

    return jobs.filter(job =>
        toDateKey(job.scheduledDate) === dateKey
    );
}

export function getDayLoad(jobs: Job[], date: Date) {
    return getJobsForDay(jobs, date).length;
}

export function isDayOverloaded(jobs: Job[], date: Date) {
    return getDayLoad(jobs, date) >= MAX_JOBS_PER_DAY;
}

export function isOverloaded(jobs: Job[], date: Date) {
    return isDayOverloaded(jobs, date);
}

export function getDayLoadLevel(jobs: Job[], date: Date): DayLoadLevel {
    const load = getDayLoad(jobs, date);

    if (load >= MAX_JOBS_PER_DAY) return "full";
    if (load >= MAX_JOBS_PER_DAY - 1) return "warning";

    return "ok";
}

export function getDayIntensity(jobs: Job[], date: Date) {
    return Math.min(getDayLoad(jobs, date) / MAX_JOBS_PER_DAY, 1);
}

export function getDayScore(jobs: Job[], date: Date) {
    const load = getDayLoad(jobs, date);

    return Math.max(0, (MAX_JOBS_PER_DAY - load) / MAX_JOBS_PER_DAY);
}

export function getEngineerLoadsForDay(jobs: Job[], date: Date) {
    const loads: Record<string, number> = {};

    for (const job of getJobsForDay(jobs, date)) {
        const key = job.engineerId?.toString() ?? "unassigned";
        loads[key] = (loads[key] ?? 0) + 1;
    }

    return loads;
}

export function getEngineerDayLoad(
    jobs: Job[],
    date: Date,
    engineerId: number
) {
    return getJobsForDay(jobs, date).filter(job =>
        job.engineerId === engineerId
    ).length;
}

export function isEngineerOverloaded(
    jobs: Job[],
    date: Date,
    engineerId: number
) {
    return getEngineerDayLoad(jobs, date, engineerId) >=
        MAX_JOBS_PER_ENGINEER_PER_DAY;
}

function getEngineerWeekLoad(
    jobs: Job[],
    weekDayKeys: Set<string>,
    engineerId: number
) {
    return jobs.filter(job =>
        weekDayKeys.has(toDateKey(job.scheduledDate)) &&
        job.engineerId === engineerId
    ).length;
}

function assignUnassignedEngineers(
    jobs: Job[],
    weekDayKeys: Set<string>,
    engineers: EngineerLike[]
) {
    if (engineers.length === 0) {
        return jobs;
    }

    const result = new Map<number, Job>();
    jobs.forEach(job => result.set(job.id, job));

    const unassignedJobs = jobs
        .filter(job =>
            weekDayKeys.has(toDateKey(job.scheduledDate)) &&
            isMovableJob(job) &&
            job.engineerId == null
        )
        .sort((a, b) => {
            const priorityDifference =
                getPriorityMoveWeight(b) - getPriorityMoveWeight(a);

            if (priorityDifference !== 0) {
                return priorityDifference;
            }

            return new Date(a.scheduledDate).getTime() -
                new Date(b.scheduledDate).getTime();
        });

    for (const job of unassignedJobs) {
        const currentJobs = Array.from(result.values());
        const jobDate = new Date(job.scheduledDate);

        const scoredEngineers = engineers
            .map(engineer => ({
                engineer,
                dayLoad: getEngineerDayLoad(currentJobs, jobDate, engineer.id),
                weekLoad: getEngineerWeekLoad(currentJobs, weekDayKeys, engineer.id)
            }))
            .sort((a, b) => {
                if (a.dayLoad !== b.dayLoad) {
                    return a.dayLoad - b.dayLoad;
                }

                if (a.weekLoad !== b.weekLoad) {
                    return a.weekLoad - b.weekLoad;
                }

                return a.engineer.id - b.engineer.id;
            });

        const availableEngineers = scoredEngineers.filter(engineer =>
            engineer.dayLoad < MAX_JOBS_PER_ENGINEER_PER_DAY
        );

        const bestEngineer =
            availableEngineers[0] ?? scoredEngineers[0];

        if (!bestEngineer) continue;

        result.set(job.id, {
            ...job,
            engineerId: bestEngineer.engineer.id
        });
    }

    return Array.from(result.values());
}

export function optimiseWeekSchedule(
    jobs: Job[],
    weekDays: Date[],
    engineers: EngineerLike[] = []
) {
    const weekDayKeys = new Set(weekDays.map(toDateKey));
    const result = new Map<number, Job>();

    jobs.forEach(job => result.set(job.id, job));

    const sortedJobs = jobs
        .filter(job => weekDayKeys.has(toDateKey(job.scheduledDate)) && isMovableJob(job))
        .sort((a, b) => {
            const priorityDifference = getPriorityMoveWeight(b) - getPriorityMoveWeight(a);
            if (priorityDifference !== 0) return priorityDifference;
            return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
        });

    for (const job of sortedJobs) {
        const currentJobs = Array.from(result.values());
        const currentDayLoad = getDayLoad(currentJobs, new Date(job.scheduledDate));

        if (currentDayLoad < MAX_JOBS_PER_DAY) continue;

        const targetDay = weekDays
            .filter(day => toDateKey(day) !== toDateKey(job.scheduledDate))
            .sort((a, b) => getDayScore(currentJobs, b) - getDayScore(currentJobs, a))[0];

        if (!targetDay) continue;

        result.set(job.id, moveJobToDay(job, targetDay));
    }

    return assignUnassignedEngineers(Array.from(result.values()), weekDayKeys, engineers);
}

function toLocalDateTimeValue(date: Date) {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
