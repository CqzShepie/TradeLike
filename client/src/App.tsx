import AccessibilityShell from "./components/accessibility/AccessibilityShell";
import { usePushNotifications } from "./hooks/usePushNotifications";
import AppRouter from "./routes/AppRouter";

function App() {
  usePushNotifications({ autoPrompt: true });

  return (
    <AccessibilityShell>
      <AppRouter />
    </AccessibilityShell>
  );
}

export default App;
