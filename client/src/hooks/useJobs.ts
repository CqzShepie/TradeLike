import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { Job } from "../types/job";
import type { NewJob } from "../types/newJob";
import { jobsService } from "../services/jobsService";
import { customerAuditService } from "../services/customerAuditService";

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

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

  async function addJob(newJob: NewJob) {
    try {
      const created = await jobsService.create(newJob);
      setJobs((prev) => [...prev, created]);
      customerAuditService.logJob("Job created", created, `Created job #${created.id}: ${created.jobTitle}.`);
      toast.success("Job created successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create job.");
    }
  }

  async function deleteJob(id: number) {
    try {
      const existingJob = jobs.find(job => job.id === id);
      await jobsService.delete(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      if (editingJob?.id === id) setEditingJob(null);
      if (existingJob) customerAuditService.logJob("Job removed", existingJob, `Removed job #${existingJob.id}: ${existingJob.jobTitle}.`);
      toast.success("Job deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete job.");
    }
  }

  async function updateJob(updatedJob: Job) {
    try {
      const updated = await jobsService.update(updatedJob);
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      setEditingJob(null);
      customerAuditService.logJob("Job edited", updated, `Edited job #${updated.id}: ${updated.jobTitle}.`);
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
