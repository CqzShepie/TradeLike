import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "../App";
import Dashboard from "../pages/Dashboard";
import Jobs from "../pages/Jobs";
import JobDetails from "../pages/JobDetails";
import Customers from "../pages/Customers";
import Signup from "../pages/Signup";
import Login from "../pages/Login";
import Quotes from "../pages/Quotes";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetails />} />

        <Route path="/customers" element={<Customers />} />
        <Route path="/quotes" element={<Quotes />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;