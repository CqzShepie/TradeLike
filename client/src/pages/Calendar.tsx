import Sidebar from "../components/layout/Sidebar";
import WeekCalendar from "../components/calendar/WeekCalendar";

export default function CalendarPage() {
    return (
        <main className="flex min-h-screen bg-slate-50">
            <Sidebar />

            <section className="flex-1 p-10">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Weekly Planner
                        </h1>

                        <p className="mt-1 text-sm text-gray-600">
                            View and manage scheduled jobs for the week.
                        </p>
                    </div>
                </div>

                <WeekCalendar />
            </section>
        </main>
    );
}