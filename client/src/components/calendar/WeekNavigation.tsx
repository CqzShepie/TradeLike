interface WeekNavigationProps {
    weekLabel: string;
    onPreviousWeek: () => void;
    onCurrentWeek: () => void;
    onNextWeek: () => void;
}

export default function WeekNavigation({
    weekLabel,
    onPreviousWeek,
    onCurrentWeek,
    onNextWeek,
}: WeekNavigationProps) {
    return (
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 className="text-lg font-semibold text-white">
                    {weekLabel}
                </h2>
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onPreviousWeek}
                    className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                >
                    Previous
                </button>

                <button
                    type="button"
                    onClick={onCurrentWeek}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                    Today
                </button>

                <button
                    type="button"
                    onClick={onNextWeek}
                    className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
