import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { Job } from "../types/job";
import type { NewJob } from "../types/newJob";
import { jobsService } from "../services/jobsService";

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // LOAD JOBS
  useEffect(() => {
    async function loadJobs() {
      try {
        const data = await jobsService.getAll();
        setJobs(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load jobs.");
        setJobs([]);
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  // ADD
  async function addJob(newJob: NewJob) {
    try {
      const created = await jobsService.create(newJob);
      setJobs((prev) => [...prev, created]);
      toast.success("Job created successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create job.");
    }
  }

  // DELETE
  async function deleteJob(id: number) {
    try {
      await jobsService.delete(id);

      setJobs((prev) => prev.filter((j) => j.id !== id));

      if (editingJob?.id === id) {
        setEditingJob(null);
      }

      toast.success("Job deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete job.");
    }
  }

  // UPDATE
  async function updateJob(updatedJob: Job) {
    try {
      const updated = await jobsService.update(updatedJob);

      setJobs((prev) =>
        prev.map((j) => (j.id === updated.id ? updated : j))
      );

      setEditingJob(null);
      toast.success("Job updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update job.");
    }
  }

  function startEdit(job: Job) {
    setEditingJob(job);
  }

  function cancelEdit() {
    setEditingJob(null);
  }

  return {
    jobs,
    loading,
    addJob,
    deleteJob,
    updateJob,
    editingJob,
    startEdit,
    cancelEdit,
  };
}