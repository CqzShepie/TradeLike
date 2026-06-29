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
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">
                    {weekLabel}
                </h2>
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onPreviousWeek}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
                >
                    Previous
                </button>

                <button
                    type="button"
                    onClick={onCurrentWeek}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Today
                </button>

                <button
                    type="button"
                    onClick={onNextWeek}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
}