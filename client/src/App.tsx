import Navbar from "./components/layout/Navbar";
import Hero from "./components/dashboard/Hero";
import Features from "./components/dashboard/Features";

function App() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <Hero />
      <Features />
    </main>
  );
}

export default App;