import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { Job } from "../types/job";
import { jobsService } from "../services/jobsService";

export function useJob(id: number) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const loadJob = useCallback(async () => {
    if (!Number.isFinite(id) || id <= 0) {
      setJob(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const job = await jobsService.getById(id);
      setJob(job);
    } catch (err) {
      console.error("Failed to load job:", err);
      toast.error("Failed to load job.");
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  return {
    job,
    loading,
    refresh: loadJob,
  };
}