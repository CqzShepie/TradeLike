import { useEffect, useState } from "react";
import { jobsService } from "../../services/jobsService";
import type { Job } from "../../types/job";

export default function TodayJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = async () => {
    try {
      setLoading(true);

      const jobs = await jobsService.getToday();
      setJobs(jobs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  if (loading) {
    return (
      <div className="rounded bg-white p-4 shadow">
        Loading today's jobs...
      </div>
    );
  }

  return (
    <div className="rounded bg-white p-4 shadow">
      <h2 className="mb-4 text-lg font-semibold">Today's Jobs</h2>

      {jobs.length === 0 ? (
        <p className="text-gray-500">No jobs scheduled for today</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between rounded border p-3"
            >
              <div>
                <p className="font-medium">{job.jobTitle}</p>
                <p className="text-sm text-gray-500">
                  {job.customer} • {job.address}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold">{job.status}</p>
                <p className="text-xs text-gray-500">
                  {job.scheduledDate
                    ? new Date(job.scheduledDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}