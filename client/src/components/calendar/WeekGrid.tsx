import DayColumn from "./DayColumn";
import type { Job } from "../../types/job";
import type { Engineer } from "../../services/engineersService";
import {
    getJobsForDay,
    getDayIntensity,
    isOverloaded
} from "../../utils/dispatchRules";

interface WeekGridProps {
    weekStart: Date;
    jobs: Job[];
    engineers: Engineer[];
    onSelectJob: (job: Job) => void;
    onMoveJob: (job: Job, newDate: Date) => void;
}

export default function WeekGrid({
    weekStart,
    jobs,
    engineers,
    onSelectJob,
    onMoveJob
}: WeekGridProps) {
    const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + index);
        date.setHours(0, 0, 0, 0);
        return date;
    });

    return (
        <div className="grid grid-cols-7">
            {days.map(day => {
                const dayJobs = getJobsForDay(jobs, day);
                const intensity = getDayIntensity(jobs, day);
                const overloaded = isOverloaded(jobs, day);

                return (
                    <DayColumn
                        key={day.toISOString()}
                        date={day}
                        jobs={dayJobs}
                        engineers={engineers}
                        onSelectJob={onSelectJob}
                        onMoveJob={onMoveJob}
                        allJobs={jobs}
                        weekDays={days}
                        intensity={intensity}
                        isOverloaded={overloaded}
                    />
                );
            })}
        </div>
    );
}