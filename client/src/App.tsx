import AccessibilityShell from "./components/accessibility/AccessibilityShell";
import AcceptStaffInvite from "./pages/AcceptStaffInvite";
import CustomerStaff from "./pages/CustomerStaff";
import PreviousJobs from "./pages/PreviousJobs";
import AppRouter from "./routes/AppRouter";

function App() {
  let content = <AppRouter />;

  if (window.location.pathname === "/accept-staff-invite") {
    content = <AcceptStaffInvite />;
  }

  if (window.location.pathname === "/team") {
    content = <CustomerStaff />;
  }

  if (window.location.pathname === "/job-history") {
    content = <PreviousJobs />;
  }

  return <AccessibilityShell>{content}</AccessibilityShell>;
}

export default App;
