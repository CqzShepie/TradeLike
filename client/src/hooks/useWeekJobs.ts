import { useEffect, useState } from "react";
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

                const data = await jobsService.getWeek(weekStart.toISOString());

                if (isMounted) {
                    setJobs(data);
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

    return {
        jobs,
        loading,
        error,
    };
}