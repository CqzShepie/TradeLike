import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "../App";
import Signup from "../pages/Signup";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;