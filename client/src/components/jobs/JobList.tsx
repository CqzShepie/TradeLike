import type { CustomerStaffMember, CustomerTeam } from "../../services/customerStaffService";
import type { JobAssignment } from "../../services/jobAssignmentsService";
import type { Job } from "../../types/job";
import JobCard from "./JobCard";

type JobListProps = {
    jobs: Job[];
    onViewJob?: (job: Job) => void;
    onDeleteJob?: (id: number) => void;
    onEditJob?: (job: Job) => void;
    teams?: CustomerTeam[];
    members?: CustomerStaffMember[];
    getAssignment?: (jobId: number) => JobAssignment | undefined;
    onUpdateAssignment?: (job: Job, patch: Partial<JobAssignment>) => void;
};

function JobList({
    jobs,
    onViewJob,
    onDeleteJob,
    onEditJob,
    teams = [],
    members = [],
    getAssignment,
    onUpdateAssignment,
}: JobListProps) {
    if (jobs.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                No jobs found.
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map(job => (
                <JobCard
                    key={job.id}
                    job={job}
                    onViewJob={onViewJob}
                    onDeleteJob={onDeleteJob}
                    onEditJob={onEditJob}
                    teams={teams}
                    members={members}
                    assignment={getAssignment?.(job.id)}
                    onUpdateAssignment={onUpdateAssignment}
                />
            ))}
        </div>
    );
}

export default JobList;
