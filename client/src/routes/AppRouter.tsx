import { Route, Routes } from "react-router-dom";

import Home from "../pages/Home";
import Dashboard from "../pages/Dashboard";
import Jobs from "../pages/Jobs";
import JobDetails from "../pages/JobDetails";
import Customers from "../pages/Customers";
import CustomerDetails from "../pages/CustomerDetails";
import CalendarPage from "../pages/Calendar";
import Signup from "../pages/Signup";
import Login from "../pages/Login";
import Quotes from "../pages/Quotes";

function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />

            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetails />} />

            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetails />} />

            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/quotes" element={<Quotes />} />

            <Route
                path="/invoices"
                element={<PlaceholderPage title="Invoices" />}
            />

            <Route
                path="/settings"
                element={<PlaceholderPage title="Settings" />}
            />

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}

function PlaceholderPage({ title }: { title: string }) {
    return (
        <main className="min-h-screen bg-slate-50 p-10">
            <h1 className="text-3xl font-bold text-gray-900">
                {title}
            </h1>

            <p className="mt-2 text-sm text-gray-600">
                This section is not built yet.
            </p>
        </main>
    );
}

function NotFoundPage() {
    return (
        <main className="min-h-screen bg-slate-50 p-10">
            <h1 className="text-3xl font-bold text-gray-900">
                Page not found
            </h1>

            <p className="mt-2 text-sm text-gray-600">
                The page you requested does not exist.
            </p>
        </main>
    );
}

export default AppRouter;