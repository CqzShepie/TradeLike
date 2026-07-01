import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";

import "./styles.css";

type PortalQuote = {
  id: number;
  title: string;
  status: string;
  total: number;
  createdAt: string;
};

type PortalJob = {
  id: number;
  title: string;
  status: string;
  scheduledDate: string;
  address: string;
};

type PortalInvoice = {
  id: number;
  invoiceNumber: string;
  title: string;
  total: number;
  status: string;
  createdAt: string;
};

type Branding = {
  businessName: string;
  primaryColour: string;
  accentColour: string;
};

const apiBase = (import.meta.env.VITE_API_URL ?? "http://localhost:5001/api").replace(/\/$/, "");
const tokenKey = "tradelike_portal_token";
const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

function App() {
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get("token") ?? localStorage.getItem(tokenKey) ?? "");
  const [email, setEmail] = useState("");
  const [tenantId, setTenantId] = useState("1");
  const [branding, setBranding] = useState<Branding>({ businessName: "TradeLike", primaryColour: "#2563eb", accentColour: "#0f172a" });
  const [quotes, setQuotes] = useState<PortalQuote[]>([]);
  const [jobs, setJobs] = useState<PortalJob[]>([]);
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [requestForm, setRequestForm] = useState({ name: "", email: "", phone: "", description: "" });
  const [notice, setNotice] = useState("");
  const currentRoute = window.location.pathname.replace("/", "") || "quotes";

  useEffect(() => {
    if (token) {
      localStorage.setItem(tokenKey, token);
      void loadPortalData(token);
    }
  }, [token]);

  useEffect(() => {
    void loadBranding();
  }, [tenantId]);

  const activeRows = useMemo(() => {
    if (currentRoute === "jobs") return jobs;
    if (currentRoute === "invoices") return invoices;
    return quotes;
  }, [currentRoute, invoices, jobs, quotes]);

  async function loadBranding() {
    const response = await fetch(`${apiBase}/branding/${tenantId}`);
    if (response.ok) {
      setBranding(await response.json() as Branding);
    }
  }

  async function loadPortalData(activeToken: string) {
    const headers = { Authorization: `Bearer ${activeToken}` };
    const [quoteResponse, jobResponse, invoiceResponse] = await Promise.all([
      fetch(`${apiBase}/customer-portal/quotes`, { headers }),
      fetch(`${apiBase}/customer-portal/jobs`, { headers }),
      fetch(`${apiBase}/customer-portal/invoices`, { headers }),
    ]);
    if (quoteResponse.ok) setQuotes(await quoteResponse.json() as PortalQuote[]);
    if (jobResponse.ok) setJobs(await jobResponse.json() as PortalJob[]);
    if (invoiceResponse.ok) setInvoices(await invoiceResponse.json() as PortalInvoice[]);
  }

  async function requestMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`${apiBase}/customer-portal/magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await response.json() as { message: string; token?: string };
    setNotice(body.message);
    if (body.token) setToken(body.token);
  }

  async function requestWork(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`${apiBase}/customer-portal/request-work`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...requestForm, tenantId: Number(tenantId) }),
    });
    setNotice(response.ok ? "Request received." : "Request could not be sent.");
    if (response.ok) setRequestForm({ name: "", email: "", phone: "", description: "" });
  }

  return (
    <main style={{ "--brand": branding.primaryColour, "--accent": branding.accentColour } as React.CSSProperties}>
      <header className="portal-header">
        <div>
          <p className="eyebrow">Customer portal</p>
          <h1>{branding.businessName}</h1>
        </div>
        <nav>
          <a href="/quotes">Quotes</a>
          <a href="/jobs">Jobs</a>
          <a href="/invoices">Invoices</a>
          <a href="/request-work">Request work</a>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Secure access</p>
          <h2>Track work, documents, and requests in one place.</h2>
        </div>
        <form onSubmit={requestMagicLink} className="login-panel">
          <label>
            Tenant
            <input value={tenantId} onChange={event => setTenantId(event.target.value)} />
          </label>
          <label>
            Email
            <input value={email} onChange={event => setEmail(event.target.value)} type="email" />
          </label>
          <button type="submit">Send magic link</button>
        </form>
      </section>

      {notice && <p className="notice">{notice}</p>}

      {currentRoute === "request-work" ? (
        <form onSubmit={requestWork} className="work-form">
          <h2>Request work</h2>
          <input placeholder="Name" value={requestForm.name} onChange={event => setRequestForm({ ...requestForm, name: event.target.value })} />
          <input placeholder="Email" value={requestForm.email} onChange={event => setRequestForm({ ...requestForm, email: event.target.value })} />
          <input placeholder="Phone" value={requestForm.phone} onChange={event => setRequestForm({ ...requestForm, phone: event.target.value })} />
          <textarea placeholder="What do you need help with?" value={requestForm.description} onChange={event => setRequestForm({ ...requestForm, description: event.target.value })} />
          <button type="submit">Send request</button>
        </form>
      ) : (
        <section className="records">
          <h2>{currentRoute}</h2>
          {activeRows.length === 0 && <p className="empty">Sign in with a magic link to view records.</p>}
          {currentRoute === "quotes" && quotes.map(quote => (
            <article key={quote.id}>
              <div>
                <h3>{quote.title}</h3>
                <p>{new Date(quote.createdAt).toLocaleDateString()}</p>
              </div>
              <strong>{quote.status}</strong>
              <span>{money.format(Number(quote.total))}</span>
            </article>
          ))}
          {currentRoute === "jobs" && jobs.map(job => (
            <article key={job.id}>
              <div>
                <h3>{job.title}</h3>
                <p>{job.address}</p>
              </div>
              <strong>{job.status}</strong>
              <span>{new Date(job.scheduledDate).toLocaleDateString()}</span>
            </article>
          ))}
          {currentRoute === "invoices" && invoices.map(invoice => (
            <article key={invoice.id}>
              <div>
                <h3>{invoice.invoiceNumber} / {invoice.title}</h3>
                <p>{new Date(invoice.createdAt).toLocaleDateString()}</p>
              </div>
              <strong>{invoice.status}</strong>
              <span>{money.format(Number(invoice.total))}</span>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
