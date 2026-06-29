import { useEffect, useState } from "react";
import { dashboardService } from "../services/dashboardService";
import type { DashboardSummary } from "../types/dashboard";

interface UseDashboardSummaryResult {
    summary: DashboardSummary | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useDashboardSummary(): UseDashboardSummaryResult {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function loadSummary() {
        try {
            setLoading(true);
            setError(null);

            const data = await dashboardService.getSummary();

            setSummary(data);
        } catch {
            setError("Unable to load dashboard.");
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadSummary();
    }, []);

    return {
        summary,
        loading,
        error,
        refresh: loadSummary
    };
}