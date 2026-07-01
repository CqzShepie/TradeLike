import AccessibilityShell from "./components/accessibility/AccessibilityShell";
import { GlobalSearchProvider } from "./contexts/GlobalSearchContext";
import { useOfflineSync } from "./hooks/useOfflineSync";
import { authService } from "./services/authService";
import AppRouter from "./routes/AppRouter";

function App() {
  return (
    <AccessibilityShell>
      <GlobalSearchProvider>
        <ServiceWorkerBridge />
        <AppRouter />
      </GlobalSearchProvider>
    </AccessibilityShell>
  );
}

function ServiceWorkerBridge() {
  useOfflineSync({
    enabled: import.meta.env.PROD && authService.hasValidSession(),
  });

  return null;
}

export default App;
