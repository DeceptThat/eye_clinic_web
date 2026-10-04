"use client";
import { Fragment, useEffect, useState } from "react";

const PAYMENTS = ["Cash", "Card", "QR transfer"];
const baht = (n) => `฿${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmt = (iso) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [me, setMe] = useState(null);
  const [filters, setFilters] = useState({ date: "", status: "", paymentMethod: "" });
  const [form, setForm] = useState(null);
  const [openId, setOpenId] = useState(null); // which receipt is expanded
  const [error, setError] = useState("");

  async function load() {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    const res = await fetch(`/api/sales?${params}`);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setSales(data);
  }

  async function loadProducts() {
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
  }

  useEffect(() => {
    load();
  }, [filters]);

  useEffect(() => {
    loadProducts();
    fetch("/api/patients").then((r) => (r.ok ? r.json() : [])).then(setPatients);
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setMe);
  }, []);

  // Products that can be sold right now
  const sellable = products.filter(
    (p) => p.isActive && p.stockQty > 0 && !(p.expiryDate && new Date(p.expiryDate) < new Date())
  );
  const priceOf = (id) => products.find((p) => p._id === id)?.price ?? 0;
  const formTotal = form ? form.items.reduce((s, it) => s + priceOf(it.product) * (Number(it.qty) || 0), 0) : 0;

  function openNew() {
    setError("");
    loadProducts();
    setForm({ patient: "", paymentMethod: "Cash", items: [{ product: "", qty: 1 }] });
  }

  const setItem = (i, field, value) =>
    setForm({ ...form, items: form.items.map((it, j) => (j === i ? { ...it, [field]: value } : it)) });
  const addItem = () => setForm({ ...form, items: [...form.items, { product: "", qty: 1 }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, j) => j !== i) });

  async function save(e) {
    e.preventDefault();
    if (!form) return; // keeps the React Compiler from reading form.items while form is null
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient: form.patient || undefined,
        paymentMethod: form.paymentMethod,
        items: form.items.map((it) => ({ product: it.product, qty: Number(it.qty) })),
      }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setForm(null);
    setError("");
    setOpenId(data._id); // show the new receipt
    load();
    loadProducts();
  }

  async function voidSale(s) {
    if (!confirm(`Void sale ${s.saleNo}? Stock will be returned.`)) return;
    const res = await fetch(`/api/sales/${s._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Voided" }),
    });
    if (!res.ok) return setError((await res.json()).error);
    setError("");
    load();
    loadProducts();
  }

  async function remove(s) {
    if (!confirm(`Delete sale ${s.saleNo} permanently?`)) return;
    const res = await fetch(`/api/sales/${s._id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error);
    load();
  }

  const input = "border rounded px-3 py-2 w-full";
  const setFilter = (f) => (e) => setFilters({ ...filters, [f]: e.target.value });

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Sales</h1>
        <button onClick={openNew} className="bg-teal-700 text-white px-4 py-2 rounded">+ New sale</button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <input type="date" className={input} value={filters.date} onChange={setFilter("date")} />
        <select className={input} value={filters.status} onChange={setFilter("status")}>
          <option value="">All statuses</option>
          <option>Completed</option>
          <option>Voided</option>
        </select>
        <select className={input} value={filters.paymentMethod} onChange={setFilter("paymentMethod")}>
          <option value="">All payments</option>
          {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <button onClick={() => setFilters({ date: "", status: "", paymentMethod: "" })}
          className="border rounded px-3 py-2">Clear filters</button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {form && (
        <form onSubmit={save} className="border rounded p-4 mb-6 space-y-3">
          <h2 className="font-semibold">New sale</h2>
          <div className="grid grid-cols-2 gap-3">
            <select className={input} value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })}>
              <option value="">Walk-in customer (no patient)</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>{p.patientNo} · {p.firstName} {p.lastName}</option>
              ))}
            </select>
            <select className={input} value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
              {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>

          {form.items.map((it, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select className={input} required value={it.product} onChange={(e) => setItem(i, "product", e.target.value)}>
                <option value="">Select product</option>
                {sellable.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.sku} · {p.name} · {baht(p.price)} (stock {p.stockQty})
                  </option>
                ))}
              </select>
              <input type="number" min="1" step="1" required className="border rounded px-3 py-2 w-24"
                value={it.qty} onChange={(e) => setItem(i, "qty", e.target.value)} />
              <span className="w-28 text-right">{baht(priceOf(it.product) * (Number(it.qty) || 0))}</span>
              {form.items.length > 1 && (
                <button type="button" onClick={() => removeItem(i)} className="text-red-600 px-2">✕</button>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between">
            <button type="button" onClick={addItem} className="text-teal-500">+ Add item</button>
            <span className="text-xl font-bold">Total {baht(formTotal)}</span>
          </div>

          <div className="flex gap-2">
            <button className="bg-teal-700 text-white px-4 py-2 rounded">Complete sale</button>
            <button type="button" onClick={() => setForm(null)} className="border px-4 py-2 rounded">Cancel</button>
          </div>
        </form>
      )}

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-800 text-gray-100 text-left">
            <th className="p-2">Sale No.</th>
            <th className="p-2">Date</th>
            <th className="p-2">Customer</th>
            <th className="p-2">Payment</th>
            <th className="p-2 text-right">Total</th>
            <th className="p-2">Status</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <Fragment key={s._id}>
              <tr key={s._id} className={`border-b ${s.status === "Voided" ? "opacity-50" : ""}`}>
                <td className="p-2 font-mono text-sm">{s.saleNo}</td>
                <td className="p-2">{fmt(s.saleDate)}</td>
                <td className="p-2">{s.patient ? `${s.patient.firstName} ${s.patient.lastName}` : "Walk-in"}</td>
                <td className="p-2">{s.paymentMethod}</td>
                <td className="p-2 text-right">{baht(s.total)}</td>
                <td className={`p-2 ${s.status === "Voided" ? "text-gray-500" : "text-green-500"}`}>{s.status}</td>
                <td className="p-2 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => setOpenId(openId === s._id ? null : s._id)} className="text-sky-400">
                    {openId === s._id ? "Hide" : "Receipt"}
                  </button>
                  {s.status === "Completed" && (
                    <button onClick={() => voidSale(s)} className="text-amber-500">Void</button>
                  )}
                  {me?.role === "Admin" && s.status === "Voided" && (
                    <button onClick={() => remove(s)} className="text-red-600">Delete</button>
                  )}
                </td>
              </tr>
              {openId === s._id && (
                <tr key={`${s._id}-receipt`} className="border-b bg-gray-900">
                  <td colSpan={7} className="p-4">
                    <table className="w-full text-sm">
                      <tbody>
                        {s.items.map((it, i) => (
                          <tr key={i}>
                            <td className="py-1 font-mono">{it.sku}</td>
                            <td className="py-1">{it.name}</td>
                            <td className="py-1 text-right">{it.qty} × {baht(it.unitPrice)}</td>
                            <td className="py-1 text-right w-32">{baht(it.qty * it.unitPrice)}</td>
                          </tr>
                        ))}
                        <tr className="font-bold">
                          <td colSpan={3} className="pt-2 text-right">Total</td>
                          <td className="pt-2 text-right">{baht(s.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-400 mt-2">
                      Sold by {s.soldBy?.name ?? "-"}
                      {s.patient && ` · Patient ${s.patient.patientNo}`}
                      {s.voidedAt && ` · Voided ${fmt(s.voidedAt)}`}
                    </p>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {sales.length === 0 && (
            <tr><td colSpan={7} className="p-4 text-center text-gray-500">No sales found</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}