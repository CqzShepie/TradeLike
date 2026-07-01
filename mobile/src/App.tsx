import { useEffect, useState } from "react";

type VanStock = {
  productId: number;
  productName: string;
  sku: string;
  qty: number;
};

type Van = {
  id: number;
  name: string;
  registration: string;
  stock: VanStock[];
};

const apiBase = (import.meta.env.VITE_API_URL ?? "http://localhost:5001/api").replace(/\/$/, "");

export default function App() {
  const [vans, setVans] = useState<Van[]>([]);
  const [selectedVan, setSelectedVan] = useState<Van | null>(null);
  const [selectedStock, setSelectedStock] = useState<VanStock | null>(null);
  const [qty, setQty] = useState(1);
  const [toVanId, setToVanId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`${apiBase}/vans`, authHeaders())
      .then(response => response.ok ? response.json() : [])
      .then(setVans)
      .catch(() => setMessage("Could not load van stock."));
  }, []);

  async function transferStock() {
    if (!selectedVan || !selectedStock) return;

    const response = await fetch(`${apiBase}/vans/${selectedVan.id}/stock/transfer`, {
      ...authHeaders(),
      method: "POST",
      body: JSON.stringify({
        productId: selectedStock.productId,
        qty,
        toVanId: toVanId ? Number(toVanId) : null,
      }),
    });

    if (!response.ok) {
      setMessage("Transfer failed.");
      return;
    }

    setMessage("Stock transferred.");
    setSelectedStock(null);
    const refreshed = await fetch(`${apiBase}/vans`, authHeaders()).then(result => result.json());
    setVans(refreshed);
  }

  return (
    <main>
      <header>
        <p>TradeLike mobile</p>
        <h1>Van stock</h1>
      </header>

      {message && <div className="notice">{message}</div>}

      <section className="van-list">
        {vans.map(van => (
          <article key={van.id} className="van-card">
            <h2>{van.name}</h2>
            <p>{van.registration || "No registration"}</p>
            <div className="stock-list">
              {van.stock.map(stock => (
                <button key={`${van.id}-${stock.productId}`} type="button" onClick={() => { setSelectedVan(van); setSelectedStock(stock); }}>
                  <span>{stock.productName}</span>
                  <strong>{stock.qty}</strong>
                </button>
              ))}
              {van.stock.length === 0 && <p className="empty">No stock recorded.</p>}
            </div>
          </article>
        ))}
      </section>

      {selectedVan && selectedStock && (
        <div className="modal">
          <section>
            <h2>Transfer stock</h2>
            <p>{selectedStock.productName} from {selectedVan.name}</p>
            <label>Quantity<input type="number" min="1" max={selectedStock.qty} value={qty} onChange={event => setQty(Number(event.target.value))} /></label>
            <label>To van<select value={toVanId} onChange={event => setToVanId(event.target.value)}><option value="">Remove from van</option>{vans.filter(van => van.id !== selectedVan.id).map(van => <option key={van.id} value={van.id}>{van.name}</option>)}</select></label>
            <div className="actions">
              <button type="button" onClick={() => setSelectedStock(null)}>Cancel</button>
              <button type="button" onClick={transferStock}>Transfer</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function authHeaders() {
  const token = localStorage.getItem("tradelike_token");
  return {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}
