import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

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
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
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
import ApiDeveloperPage from "../pages/api-dev/ApiDeveloperPage";
import BrandingPage from "../pages/branding/BrandingPage";
import ImportExportPage from "../pages/import/ImportExportPage";
import Inventory from "../pages/inventory/Inventory";
import SupportCenter from "../pages/SupportCenter";
import AccessDenied from "../pages/AccessDenied";
import NotFound from "../pages/NotFound";
import UpgradeRequired from "../pages/UpgradeRequired";
import SettingsSectionPage from "../pages/settings/SettingsSectionPage";
import { authService } from "../services/authService";
import {
  findNavigationItemByPath,
  getNavigationAccess,
} from "./navigationConfig";
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
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/company-invite" element={<CompanyInvite />} />
        <Route path="/accept-staff-invite" element={<AcceptStaffInvite />} />
        <Route path="/accept-company-staff-invite" element={<AcceptCompanyStaffInvite />} />

        <Route path="/dashboard" element={<NavigationAccessRoute path="/dashboard"><Dashboard /></NavigationAccessRoute>} />

        <Route path="/jobs" element={<NavigationAccessRoute path="/jobs"><Jobs /></NavigationAccessRoute>} />
        <Route path="/job-history" element={<NavigationAccessRoute path="/jobs"><PreviousJobs /></NavigationAccessRoute>} />
        <Route path="/jobs/:id" element={<NavigationAccessRoute path="/jobs"><JobDetails /></NavigationAccessRoute>} />

        <Route path="/customers" element={<NavigationAccessRoute path="/customers"><Customers /></NavigationAccessRoute>} />
        <Route path="/customers/:id" element={<NavigationAccessRoute path="/customers"><CustomerDetails /></NavigationAccessRoute>} />

        <Route path="/calendar" element={<NavigationAccessRoute path="/calendar"><CalendarPage /></NavigationAccessRoute>} />
        <Route path="/team" element={<NavigationAccessRoute path="/team"><CustomerStaff /></NavigationAccessRoute>} />
        <Route path="/leave" element={<NavigationAccessRoute path="/team"><CustomerStaff /></NavigationAccessRoute>} />
        <Route path="/reports" element={<NavigationAccessRoute path="/reports"><Reports /></NavigationAccessRoute>} />
        <Route path="/reports/overview" element={<NavigationAccessRoute path="/reports/overview"><ReportsOverview /></NavigationAccessRoute>} />
        <Route path="/inventory" element={<NavigationAccessRoute path="/inventory"><Inventory /></NavigationAccessRoute>} />
        <Route path="/support" element={<SupportCenter />} />

        <Route path="/quotes" element={<NavigationAccessRoute path="/quotes"><Quotes /></NavigationAccessRoute>} />
        <Route path="/quotes/:id" element={<NavigationAccessRoute path="/quotes"><QuoteDetails /></NavigationAccessRoute>} />
        <Route path="/invoices" element={<NavigationAccessRoute path="/invoices"><Invoices /></NavigationAccessRoute>} />
        <Route path="/settings" element={<NavigationAccessRoute path="/settings"><Settings /></NavigationAccessRoute>} />
        <Route path="/settings/accessibility" element={<NavigationAccessRoute path="/settings/accessibility"><A11ySettings /></NavigationAccessRoute>} />
        <Route path="/settings/api" element={<NavigationAccessRoute path="/settings/api"><ApiDeveloperPage /></NavigationAccessRoute>} />
        <Route path="/settings/branding" element={<NavigationAccessRoute path="/settings/branding"><BrandingPage /></NavigationAccessRoute>} />
        <Route path="/settings/import-export" element={<NavigationAccessRoute path="/settings/import-export"><ImportExportPage /></NavigationAccessRoute>} />
        <Route path="/settings/billing" element={<SettingsRoute path="/settings/billing" />} />
        <Route path="/settings/billing/usage" element={<SettingsRoute path="/settings/billing/usage" />} />
        <Route path="/settings/profile" element={<SettingsRoute path="/settings/profile" />} />
        <Route path="/settings/business" element={<SettingsRoute path="/settings/business" />} />
        <Route path="/settings/company" element={<SettingsRoute path="/settings/company" />} />
        <Route path="/settings/users" element={<SettingsRoute path="/settings/users" />} />
        <Route path="/settings/permissions" element={<SettingsRoute path="/settings/permissions" />} />
        <Route path="/settings/staff" element={<SettingsRoute path="/settings/staff" />} />
        <Route path="/settings/plan-limits" element={<SettingsRoute path="/settings/plan-limits" />} />
        <Route path="/settings/templates" element={<SettingsRoute path="/settings/templates" />} />
        <Route path="/settings/documents" element={<SettingsRoute path="/settings/documents" />} />
        <Route path="/settings/full-data-export" element={<SettingsRoute path="/settings/full-data-export" />} />
        <Route path="/settings/integrations" element={<SettingsRoute path="/settings/integrations" />} />
        <Route path="/settings/accounting" element={<SettingsRoute path="/settings/accounting" />} />
        <Route path="/settings/notifications" element={<SettingsRoute path="/settings/notifications" />} />
        <Route path="/settings/webhooks" element={<SettingsRoute path="/settings/webhooks" />} />
        <Route path="/settings/developer" element={<SettingsRoute path="/settings/developer" />} />
        <Route path="/settings/automations" element={<SettingsRoute path="/settings/automations" />} />
        <Route path="/access-denied" element={<ProtectedRoute><AccessDenied /></ProtectedRoute>} />
        <Route path="/upgrade-required" element={<ProtectedRoute><UpgradeRequired /></ProtectedRoute>} />

        <Route
          path="/admin"
          element={
            <StaffRoute>
              <AdminPortal />
            </StaffRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function NavigationAccessRoute({ path, children }: { path: string; children: React.ReactNode }) {
  if (!authService.hasValidSession()) {
    return <Navigate to="/login" replace />;
  }

  const item = findNavigationItemByPath(path);
  const access = item ? getNavigationAccess(item, authService.getUser()) : "allowed";

  if (access === "denied") {
    return <AccessDenied />;
  }

  if (access === "upgrade") {
    return <UpgradeRequired featureName={item?.label} minimumPlan={item?.minimumPlan} />;
  }

  return <>{children}</>;
}

function SettingsRoute({ path }: { path: string }) {
  const item = findNavigationItemByPath(path);

  if (!item) {
    return <NotFound />;
  }

  return (
    <NavigationAccessRoute path={path}>
      <SettingsSectionPage item={item} />
    </NavigationAccessRoute>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

export default AppRouter;
