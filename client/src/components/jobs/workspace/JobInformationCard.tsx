import Card from "../../ui/Card";

import type { Job } from "../../../types/job";

type JobInformationCardProps = {
  job: Job;
};

function JobInformationCard({
  job,
}: JobInformationCardProps) {
  return (
    <Card>
      <h2 className="mb-5 text-xl font-semibold">
        Job Information
      </h2>

      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="text-slate-500">
            Status
          </span>

          <span>{job.status}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-500">
            Priority
          </span>

          <span>{job.priority}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-500">
            Scheduled
          </span>

          <span>{job.time}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-500">
            Address
          </span>

          <span>{job.address}</span>
        </div>
      </div>
    </Card>
  );
}

export default JobInformationCard;