import Sidebar from "../components/layout/Sidebar";

export default function AccessibilitySettings() {
  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <section id="main-content" className="min-w-0 flex-1 p-10">
        <div className="max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Settings</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Accessibility</h1>
          <p className="mt-2 text-sm text-slate-600">Accessibility settings are being added.</p>
        </div>
      </section>
    </main>
  );
}
