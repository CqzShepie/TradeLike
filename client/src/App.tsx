import AcceptStaffInvite from "./pages/AcceptStaffInvite";
import CustomerStaff from "./pages/CustomerStaff";
import PreviousJobs from "./pages/PreviousJobs";
import AppRouter from "./routes/AppRouter";

function App() {
  if (window.location.pathname === "/accept-staff-invite") {
    return <AcceptStaffInvite />;
  }

  if (window.location.pathname === "/team") {
    return <CustomerStaff />;
  }

  if (window.location.pathname === "/job-history") {
    return <PreviousJobs />;
  }

  return <AppRouter />;
}

export default App;
