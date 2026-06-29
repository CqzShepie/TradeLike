import type { Job } from "../types/job";

/**
 * Count jobs per engineer for a given day/week
 */
export function getEngineerLoads(jobs: Job[]) {
    const map: Record<string, number> = {};

    for (const job of jobs) {
        const key = job.engineerId ?? "unassigned";
        map[key] = (map[key] || 0) + 1;
    }

    return map;
}

/**
 * Find least busy engineer
 */
export function getLeastLoadedEngineer(
    engineers: { id: number }[],
    jobs: Job[]
): number | null {
    const loads = getEngineerLoads(jobs);

    let bestId: number | null = null;
    let bestLoad = Infinity;

    for (const eng of engineers) {
        const load = loads[eng.id] ?? 0;

        if (load < bestLoad) {
            bestLoad = load;
            bestId = eng.id;
        }
    }

    return bestId;
}