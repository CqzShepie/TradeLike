import { useCallback, useEffect, useState } from "react";
import { ApiError, isApiError } from "../services/apiClient";
import { dashboardService } from "../services/dashboardService";
import type { DashboardSummary } from "../types/dashboard";

interface UseDashboardSummaryResult {
    summary: DashboardSummary | null;
    loading: boolean;
    error: ApiError | Error | null;
    refresh: () => Promise<void>;
}

export function useDashboardSummary(): UseDashboardSummaryResult {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<ApiError | Error | null>(null);

    const loadSummary = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await dashboardService.getSummary();

            setSummary(data);
        } catch (err) {
            setError(isApiError(err) ? err : new Error("Unable to load dashboard."));
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        dashboardService.getSummary()
            .then(data => {
                if (isMounted) {
                    setSummary(data);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setError(isApiError(err) ? err : new Error("Unable to load dashboard."));
                    setSummary(null);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return {
        summary,
        loading,
        error,
        refresh: loadSummary
    };
}
