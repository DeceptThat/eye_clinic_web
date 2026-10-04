"use client";
import { useEffect, useState } from "react";

const CATEGORIES = ["Glasses", "Medicine", "Accessory"];
const EMPTY = {
  name: "", brand: "", category: "", sku: "", price: "",
  stockQty: 0, reorderLevel: 5, expiryDate: "", isActive: true,
};
const baht = (n) => `฿${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [me, setMe] = useState(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [form, setForm] = useState(null);
  const [prices, setPrices] = useState({}); // inline price edits: { productId: "1200" }
  const [error, setError] = useState("");

  const isAdmin = me?.role === "Admin";

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (lowOnly) params.set("lowStock", "1");
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setProducts(data);
  }

  useEffect(() => {
    load();
  }, [q, category, lowOnly]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setMe);
  }, []);

  async function send(url, method, body) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return false;
    }
    setError("");
    load();
    return true;
  }

  async function save(e) {
    e.preventDefault();
    const body = {
      ...form,
      price: Number(form.price),
      reorderLevel: Number(form.reorderLevel),
      expiryDate: form.category === "Medicine" && form.expiryDate ? form.expiryDate : null,
    };
    if (form._id) delete body.stockQty;          // editing: stock is changed with Restock
    else body.stockQty = Number(form.stockQty);  // new product: starting stock
    const ok = form._id
      ? await send(`/api/products/${form._id}`, "PUT", body)
      : await send("/api/products", "POST", body);
    if (ok) setForm(null);
  }

  async function savePrice(p) {
    const value = prices[p._id];
    if (value === undefined || value === "" || Number(value) === p.price) return;
    const ok = await send(`/api/products/${p._id}`, "PUT", { price: Number(value) });
    if (ok) setPrices({ ...prices, [p._id]: undefined });
  }

  async function restock(p) {
    const qty = prompt(`Add how many to "${p.name}"? (now ${p.stockQty})`);
    if (!qty) return;
    await send(`/api/products/${p._id}`, "PUT", { restock: Number(qty) });
  }

  async function remove(p) {
    if (!confirm(`Delete ${p.name}?`)) return;
    await send(`/api/products/${p._id}`, "DELETE");
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const input = "border rounded px-3 py-2 w-full";
  const isLow = (p) => p.stockQty <= p.reorderLevel;
  const isExpired = (p) => p.expiryDate && new Date(p.expiryDate) < new Date();

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Products &amp; Prices</h1>
        {isAdmin && (
          <button onClick={() => { setError(""); setForm({ ...EMPTY }); }}
            className="bg-teal-700 text-white px-4 py-2 rounded">+ Add product</button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <input className={`${input} col-span-2`} placeholder="Search name, brand or SKU"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {!isAdmin && me && (
        <p className="text-sm text-gray-400 mb-3">View only: prices and stock can be changed by Admin.</p>
      )}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {form && (
        <form onSubmit={save} className="border rounded p-4 mb-6 grid grid-cols-3 gap-3">
          <h2 className="col-span-3 font-semibold">{form._id ? `Edit ${form.sku}` : "New product"}</h2>
          <input className={input} placeholder="Name" required value={form.name} onChange={set("name")} />
          <input className={input} placeholder="Brand" value={form.brand || ""} onChange={set("brand")} />
          <select className={input} required value={form.category} onChange={set("category")}>
            <option value="">Category</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className={input} placeholder="SKU (e.g. GL-001)" required value={form.sku} onChange={set("sku")} />
          <label className="text-sm">Price (THB)
            <input className={input} type="number" min="0" step="0.01" required value={form.price} onChange={set("price")} />
          </label>
          {form._id ? (
            <p className="text-sm self-end pb-2">Stock: {form.stockQty} (use Restock to add)</p>
          ) : (
            <label className="text-sm">Starting stock
              <input className={input} type="number" min="0" step="1" required
                value={form.stockQty} onChange={set("stockQty")} />
            </label>
          )}
          <label className="text-sm">Reorder level
            <input className={input} type="number" min="0" step="1" value={form.reorderLevel} onChange={set("reorderLevel")} />
          </label>
          {form.category === "Medicine" && (
            <label className="text-sm">Expiry date
              <input className={input} type="date" required value={form.expiryDate || ""} onChange={set("expiryDate")} />
            </label>
          )}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active (can be sold)
          </label>
          <div className="col-span-3 flex gap-2">
            <button className="bg-teal-700 text-white px-4 py-2 rounded">Save</button>
            <button type="button" onClick={() => setForm(null)} className="border px-4 py-2 rounded">Cancel</button>
          </div>
        </form>
      )}

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-800 text-gray-100 text-left">
            <th className="p-2">SKU</th>
            <th className="p-2">Product</th>
            <th className="p-2">Category</th>
            <th className="p-2">Price</th>
            <th className="p-2">Stock</th>
            <th className="p-2">Expiry</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id} className={`border-b ${p.isActive ? "" : "opacity-50"}`}>
              <td className="p-2 font-mono text-sm">{p.sku}</td>
              <td className="p-2">{p.name}<div className="text-xs text-gray-400">{p.brand}</div></td>
              <td className="p-2">{p.category}</td>
              <td className="p-2">
                {isAdmin ? (
                  <div className="flex gap-1">
                    <input type="number" min="0" step="0.01" className="border rounded px-2 py-1 w-24"
                      value={prices[p._id] ?? p.price}
                      onChange={(e) => setPrices({ ...prices, [p._id]: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && savePrice(p)} />
                    {prices[p._id] !== undefined && Number(prices[p._id]) !== p.price && (
                      <button onClick={() => savePrice(p)} className="text-teal-500 text-sm">Save</button>
                    )}
                  </div>
                ) : (
                  baht(p.price)
                )}
              </td>
              <td className="p-2">
                {p.stockQty}
                {isLow(p) && <span className="ml-2 text-xs bg-amber-600 text-white rounded px-1">LOW</span>}
              </td>
              <td className="p-2 text-sm">
                {p.expiryDate ? (
                  <span className={isExpired(p) ? "text-red-500" : ""}>
                    {p.expiryDate.slice(0, 10)}{isExpired(p) && " (expired)"}
                  </span>
                ) : "-"}
              </td>
              <td className="p-2 text-right space-x-2 whitespace-nowrap">
                {isAdmin && (
                  <>
                    <button onClick={() => restock(p)} className="text-sky-400">Restock</button>
                    <button onClick={() => { setError(""); setForm({ ...EMPTY, ...p, expiryDate: p.expiryDate?.slice(0, 10) ?? "" }); }}
                      className="text-teal-500">Edit</button>
                    <button onClick={() => remove(p)} className="text-red-600">Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr><td colSpan={7} className="p-4 text-center text-gray-500">No products found</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}