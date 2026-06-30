import { useMemo, useState } from "react";
import Sidebar from "../components/layout/Sidebar";

type SupportItem = {
  id: string;
  title: string;
  details: string;
  pageUrl: string;
  priority: "Low" | "Normal" | "High" | "Urgent";
  category: string;
  status: "Open" | "In Review" | "Fixed" | "Closed";
  createdAt: string;
};

const storageKey = "tradelike_support_items";

export default function SupportCenter() {
  const [items, setItems] = useState<SupportItem[]>(loadItems);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState<SupportItem["priority"]>("Normal");
  const [category, setCategory] = useState("General");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredItems = useMemo(() => statusFilter === "all" ? items : items.filter(item => item.status === statusFilter), [items, statusFilter]);

  function save(nextItems: SupportItem[]) {
    setItems(nextItems);
    localStorage.setItem(storageKey, JSON.stringify(nextItems));
  }

  function createItem() {
    if (title.trim() === "" || details.trim() === "") return;

    const item: SupportItem = {
      id: crypto.randomUUID(),
      title: title.trim(),
      details: details.trim(),
      pageUrl: window.location.href,
      priority,
      category,
      status: "Open",
      createdAt: new Date().toISOString(),
    };

    save([item, ...items]);
    setTitle("");
    setDetails("");
    setPriority("Normal");
    setCategory("General");
  }

  function updateStatus(id: string, status: SupportItem["status"]) {
    save(items.map(item => item.id === id ? { ...item, status } : item));
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <section className="min-w-0 flex-1 p-10">
        <div className="max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Support</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Support & Feedback</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Capture customer issues, feature ideas, page links, priority and status. This is a customer-facing shell ready to connect to the TradeLike support queue later.
          </p>

          <div className="mt-8 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Submit item</h2>
              <div className="mt-4 grid gap-3">
                <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600" />
                <textarea value={details} onChange={event => setDetails(event.target.value)} placeholder="What happened or what should be improved?" rows={6} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600" />
                <select value={category} onChange={event => setCategory(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"><option>General</option><option>Jobs</option><option>Calendar</option><option>Quotes</option><option>Invoices</option><option>Staff & Teams</option><option>Reporting</option></select>
                <select value={priority} onChange={event => setPriority(event.target.value as SupportItem["priority"])} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select>
                <button type="button" onClick={createItem} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save support item</button>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">Support queue</h2>
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All statuses</option><option>Open</option><option>In Review</option><option>Fixed</option><option>Closed</option></select>
              </div>
              <div className="mt-4 grid gap-3">
                {filteredItems.map(item => <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.category} · {item.priority} · {new Date(item.createdAt).toLocaleString("en-GB")}</p></div><select value={item.status} onChange={event => updateStatus(item.id, event.target.value as SupportItem["status"])} className="rounded-lg border border-slate-300 px-2 py-1 text-xs"><option>Open</option><option>In Review</option><option>Fixed</option><option>Closed</option></select></div><p className="mt-3 text-sm text-slate-700">{item.details}</p><p className="mt-3 truncate text-xs text-slate-500">Page: {item.pageUrl}</p></article>)}
                {filteredItems.length === 0 && <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No support items yet.</p>}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function loadItems(): SupportItem[] {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SupportItem[];
  } catch {
    return [];
  }
}
