import AcceptStaffInvite from "./pages/AcceptStaffInvite";
import AppRouter from "./routes/AppRouter";

function App() {
  if (window.location.pathname === "/accept-staff-invite") {
    return <AcceptStaffInvite />;
  }

  return <AppRouter />;
}

export default App;
