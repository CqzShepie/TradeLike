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
import A11ySettings from "../pages/AccessibilitySettings";
import Signup from "../pages/Signup";
import Login from "../pages/Login";
import Quotes from "../pages/Quotes";
import QuoteDetails from "../pages/QuoteDetails";
import Invoices from "../pages/Invoices";
import AdminPortal from "../pages/AdminPortal";
import Settings from "../pages/Settings";
import CompanyInvite from "../pages/CompanyInvite";
import AcceptCompanyStaffInvite from "../pages/AcceptCompanyStaffInvite";
import AcceptStaffInvite from "../pages/AcceptStaffInvite";
import CustomerStaff from "../pages/CustomerStaff";
import Reports from "../pages/Reports";
import ReportsOverview from "../pages/ReportsOverview";
import SupportCenter from "../pages/SupportCenter";
import ProtectedRoute from "./ProtectedRoute";
import StaffRoute from "./StaffRoute";

function AppRouter() {
  return (
    <>
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/company-invite" element={<CompanyInvite />} />
        <Route path="/accept-staff-invite" element={<AcceptStaffInvite />} />
        <Route path="/accept-company-staff-invite" element={<AcceptCompanyStaffInvite />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
        <Route path="/job-history" element={<ProtectedRoute><PreviousJobs /></ProtectedRoute>} />
        <Route path="/jobs/:id" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />

        <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
        <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetails /></ProtectedRoute>} />

        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute><CustomerStaff /></ProtectedRoute>} />
        <Route path="/leave" element={<ProtectedRoute><CustomerStaff /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/reports/overview" element={<ProtectedRoute><ReportsOverview /></ProtectedRoute>} />
        <Route path="/support" element={<SupportCenter />} />

        <Route path="/quotes" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
        <Route path="/quotes/:id" element={<ProtectedRoute><QuoteDetails /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/settings/billing" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/settings/accessibility" element={<ProtectedRoute><A11ySettings /></ProtectedRoute>} />

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
