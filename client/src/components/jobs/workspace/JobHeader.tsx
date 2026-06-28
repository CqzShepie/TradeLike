import { Link } from "react-router-dom";

import Card from "../../ui/Card";
import Button from "../../ui/Button";
import StatusBadge from "../../ui/StatusBadge";
import PriorityBadge from "../../ui/PriorityBadge";

import type { Job } from "../../../types/job";

type JobHeaderProps = {
  job: Job;
  onEdit: () => void;
};

function JobHeader({ job, onEdit }: JobHeaderProps) {
  return (
    <Card>
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            to="/jobs"
            className="text-sm text-slate-500 transition-colors hover:text-blue-600"
          >
            ← Back to Jobs
          </Link>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {job.jobTitle}
          </h1>

          <p className="mt-1 text-slate-500">
            {job.customer}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={job.status} />
          <PriorityBadge priority={job.priority} />

          <Button onClick={onEdit}>
            Edit Job
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default JobHeader;