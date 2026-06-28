import { useState } from "react";
import { toast } from "sonner";

import type { Job } from "../types/job";
import { jobsService } from "../services/jobsService";

export function useUpdateJob() {
  const [saving, setSaving] = useState(false);

  async function update(job: Job) {
    try {
      setSaving(true);

      const updatedJob = await jobsService.update(job);

      toast.success("Job updated successfully.");

      return updatedJob;
    } catch (error) {
      console.error(error);
      toast.error("Failed to update job.");
      throw error;
    } finally {
      setSaving(false);
    }
  }

  return {
    update,
    saving,
  };
}