import AccessibilityShell from "./components/accessibility/AccessibilityShell";
import AppRouter from "./routes/AppRouter";

function App() {
  return (
    <AccessibilityShell>
      <AppRouter />
    </AccessibilityShell>
  );
}

export default App;
