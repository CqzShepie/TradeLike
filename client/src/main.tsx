import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import AppRouter from "./routes/AppRouter";
import { Toaster } from "sonner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRouter />
    <Toaster
      richColors
      position="top-right"
      duration={2500}
    />
  </StrictMode>
);