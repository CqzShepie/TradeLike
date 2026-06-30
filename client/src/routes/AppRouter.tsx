import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

import Home from "../pages/Home";
import Dashboard from "../pages/Dashboard";
import Jobs from "../pages/Jobs";
import JobDetails from "../pages/JobDetails";
import PreviousJobs from "../pages/PreviousJobs";
import Customers from "../pages/Customers";
import CustomerDetails from "../pages/CustomerDetails";
import CalendarPage from "../pages/Calendar";
import Signup from "../pages/Signup";
import Login from "../pages/Login";
import Quotes from "../pages/Quotes";
import QuoteDetails from "../pages/QuoteDetails";
import AdminPortal from "../pages/AdminPortal";
import Settings from "../pages/Settings";
import CompanyInvite from "../pages/CompanyInvite";
import CustomerStaff from "../pages/CustomerStaff";
import Reports from "../pages/Reports";
import SupportCenter from "../pages/SupportCenter";
import StaffRoute from "./StaffRoute";

function AppRouter() {
  return (
    <>
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/company-invite" element={<CompanyInvite />} />
        <Route path="/accept-company-staff-invite" element={<CompanyInvite />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/jobs" element={<Jobs />} />
        <Route path="/job-history" element={<PreviousJobs />} />
        <Route path="/jobs/:id" element={<JobDetails />} />

        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetails />} />

        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/team" element={<CustomerStaff />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/support" element={<SupportCenter />} />

        <Route path="/quotes" element={<Quotes />} />
        <Route path="/quotes/:id" element={<QuoteDetails />} />

        <Route path="/invoices" element={<PlaceholderPage title="Invoices" />} />
        <Route path="/settings" element={<Settings />} />

        <Route
          path="/admin"
          element={
            <StaffRoute>
              <AdminPortal />
            </StaffRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="min-h-screen bg-slate-50 pl-64">
      <section className="p-10">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">This section is not built yet.</p>
      </section>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-50 pl-64">
      <section className="p-10">
        <h1 className="text-3xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-600">The page you requested does not exist.</p>
      </section>
    </main>
  );
}

export default AppRouter;
