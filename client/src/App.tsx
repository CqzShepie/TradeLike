import AccessibilityShell from "./components/accessibility/AccessibilityShell";
import AcceptStaffInvite from "./pages/AcceptStaffInvite";
import A11ySettings from "./pages/AccessibilitySettings";
import CustomerStaff from "./pages/CustomerStaff";
import PreviousJobs from "./pages/PreviousJobs";
import AppRouter from "./routes/AppRouter";

function App() {
  let content = <AppRouter />;

  if (window.location.pathname === "/accept-staff-invite") content = <AcceptStaffInvite />;
  if (window.location.pathname === "/team") content = <CustomerStaff />;
  if (window.location.pathname === "/job-history") content = <PreviousJobs />;
  if (window.location.pathname === "/settings/accessibility") content = <A11ySettings />;

  return <AccessibilityShell>{content}</AccessibilityShell>;
}

export default App;
