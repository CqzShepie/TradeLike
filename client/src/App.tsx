import Navbar from "./components/layout/Navbar";
import Hero from "./components/dashboard/Hero";
import Features from "./components/dashboard/Features";
import DashboardPreview from "./components/dashboard/DashboardPreview";

function App() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <Hero />
      <Features />
      <DashboardPreview />
    </main>
  );
}

export default App;