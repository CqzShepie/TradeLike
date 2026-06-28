import Card from "../ui/Card";
import SectionHeader from "../ui/SectionHeader";

import type { Job } from "../../types/job";

type TodaysScheduleProps = {
  jobs: Job[];
};

function TodaysSchedule({
  jobs,
}: TodaysScheduleProps) {
  const todaysJobs = [...jobs]
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 5);

  return (
    <Card>
      <SectionHeader title="Today's Schedule" />

      <div className="space-y-4">
        {todaysJobs.length === 0 ? (
          <p className="text-slate-500">
            No jobs scheduled today.
          </p>
        ) : (
          todaysJobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
            >
              <div>
                <p className="font-medium">
                  {job.jobTitle}
                </p>

                <p className="text-sm text-slate-500">
                  {job.customer}
                </p>
              </div>

              <span className="font-semibold text-blue-600">
                {job.time}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export default TodaysSchedule;