"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/components/AppShell";
import {
  Alert, Badge, EmptyRow, Field, Icon, Modal, Page, PageHeader, SearchInput, Toolbar, baht, fmtDate,
} from "@/components/ui";

const CATEGORIES = ["Glasses", "Medicine", "Accessory"];
const CATEGORY_TONE = { Glasses: "blue", Medicine: "violet", Accessory: "gray" };
const EMPTY = {
  name: "", brand: "", category: "", sku: "", price: "",
  stockQty: 0, reorderLevel: 5, expiryDate: "", isActive: true,
};

export default function ProductsPage() {
  const user = useUser();
  const isAdmin = user?.role === "Admin";
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [form, setForm] = useState(null);
  const [restockFor, setRestockFor] = useState(null); // product being restocked
  const [restockQty, setRestockQty] = useState("");
  const [prices, setPrices] = useState({}); // inline price edits: { productId: "1200" }
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (lowOnly) params.set("lowStock", "1");
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setProducts(data);
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, [q, category, lowOnly]);

  // Sends a change; returns the error message, or "" when it worked
  async function send(url, method, body) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) return data.error || "Something went wrong";
    load();
    return "";
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
    const err = form._id
      ? await send(`/api/products/${form._id}`, "PUT", body)
      : await send("/api/products", "POST", body);
    if (err) return setFormError(err);
    setForm(null);
  }

  async function savePrice(p) {
    const value = prices[p._id];
    if (value === undefined || value === "" || Number(value) === p.price) return;
    const err = await send(`/api/products/${p._id}`, "PUT", { price: Number(value) });
    if (err) return setError(err);
    setError("");
    setPrices({ ...prices, [p._id]: undefined });
  }

  async function restock(e) {
    e.preventDefault();
    const err = await send(`/api/products/${restockFor._id}`, "PUT", { restock: Number(restockQty) });
    if (err) return setFormError(err);
    setRestockFor(null);
  }

  async function remove(p) {
    if (!confirm(`Delete ${p.name}?`)) return;
    const err = await send(`/api/products/${p._id}`, "DELETE");
    setError(err);
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const isLow = (p) => p.stockQty <= p.reorderLevel;
  const isExpired = (p) => p.expiryDate && new Date(p.expiryDate) < new Date();
  const lowCount = products.filter(isLow).length;

  return (
    <Page>
      <PageHeader
        title="Products & Prices"
        description="Glasses, medicine and accessories sold at the front desk."
        actions={
          isAdmin && (
            <button onClick={() => { setFormError(""); setForm({ ...EMPTY }); }} className="btn btn-primary">
              <Icon name="plus" className="h-4 w-4" /> Add product
            </button>
          )
        }
      />

      <Toolbar>
        <SearchInput placeholder="Search name, brand or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
          {["", ...CATEGORIES].map((c) => (
            <button
              key={c || "all"}
              type="button"
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                category === c ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
              }`}
            >
              {c || "All"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 whitespace-nowrap px-1 text-sm text-slate-700">
          <input type="checkbox" className="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </Toolbar>

      {user && !isAdmin && (
        <Alert tone="blue">View only: prices and stock are managed by Admin.</Alert>
      )}
      {lowCount > 0 && !lowOnly && (
        <Alert tone="amber">
          {lowCount} product{lowCount === 1 ? " is" : "s are"} at or below the reorder level.{" "}
          <button className="font-medium underline" onClick={() => setLowOnly(true)}>Show them</button>
        </Alert>
      )}
      <Alert onClose={() => setError("")}>{error}</Alert>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Expiry</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} className={p.isActive ? "" : "opacity-60"}>
                <td>
                  <div className="font-medium text-slate-900">{p.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="id-text">{p.sku}</span>
                    {p.brand && <span className="text-xs text-slate-500">· {p.brand}</span>}
                    {!p.isActive && <Badge tone="gray">Inactive</Badge>}
                  </div>
                </td>
                <td><Badge tone={CATEGORY_TONE[p.category]}>{p.category}</Badge></td>
                <td>
                  {isAdmin ? (
                    <div className="flex items-center gap-1.5">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">฿</span>
                        <input
                          type="number" min="0" step="0.01"
                          className="input w-28 py-1.5 pl-6"
                          value={prices[p._id] ?? p.price}
                          onChange={(e) => setPrices({ ...prices, [p._id]: e.target.value })}
                          onKeyDown={(e) => e.key === "Enter" && savePrice(p)}
                          aria-label={`Price of ${p.name}`}
                        />
                      </div>
                      {prices[p._id] !== undefined && Number(prices[p._id]) !== p.price && (
                        <button onClick={() => savePrice(p)} className="btn btn-primary btn-sm">Save</button>
                      )}
                    </div>
                  ) : (
                    <span className="font-medium text-slate-900">{baht(p.price)}</span>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${isLow(p) ? "text-amber-700" : "text-slate-900"}`}>{p.stockQty}</span>
                    {isLow(p) && <Badge tone="amber">Low</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">reorder at {p.reorderLevel}</div>
                </td>
                <td className="whitespace-nowrap">
                  {p.expiryDate ? (
                    isExpired(p) ? <Badge tone="red">Expired {fmtDate(p.expiryDate)}</Badge> : fmtDate(p.expiryDate)
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap text-right">
                  {isAdmin && (
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => { setFormError(""); setRestockQty(""); setRestockFor(p); }}
                        className="btn btn-secondary btn-sm"
                      >
                        <Icon name="plus" className="h-3.5 w-3.5" /> Restock
                      </button>
                      <button
                        onClick={() => { setFormError(""); setForm({ ...EMPTY, ...p, expiryDate: p.expiryDate?.slice(0, 10) ?? "" }); }}
                        className="btn-icon" title="Edit" aria-label="Edit"
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(p)} className="btn-icon-danger" title="Delete" aria-label="Delete">
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {loaded && products.length === 0 && (
              <EmptyRow colSpan={6} icon="box" title="No products found" />
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal
          title={form._id ? "Edit product" : "New product"}
          subtitle={form._id ? form.sku : "Stock starts at the number you enter; add more later with Restock."}
          onClose={() => setForm(null)}
          footer={
            <>
              <button type="button" onClick={() => setForm(null)} className="btn btn-secondary">Cancel</button>
              <button form="product-form" className="btn btn-primary">Save product</button>
            </>
          }
        >
          <form id="product-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {formError && <div className="sm:col-span-2"><Alert>{formError}</Alert></div>}
            <Field label="Name" span>
              <input className="input" required value={form.name} onChange={set("name")} />
            </Field>
            <Field label="Brand">
              <input className="input" value={form.brand || ""} onChange={set("brand")} />
            </Field>
            <Field label="Category">
              <select className="input" required value={form.category} onChange={set("category")}>
                <option value="">Select…</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="SKU" hint="e.g. GL-001">
              <input className="input" required pattern="[A-Za-z0-9\-]{2,20}" title="Letters, numbers and - (2–20 characters)" value={form.sku} onChange={set("sku")} />
            </Field>
            <Field label="Price (THB)">
              <input className="input" type="number" min="0" step="0.01" required value={form.price} onChange={set("price")} />
            </Field>
            {form._id ? (
              <Field label="Stock" hint="Use Restock to add stock">
                <input className="input" disabled value={form.stockQty} />
              </Field>
            ) : (
              <Field label="Starting stock">
                <input className="input" type="number" min="0" step="1" required value={form.stockQty} onChange={set("stockQty")} />
              </Field>
            )}
            <Field label="Reorder level" hint="Warn when stock reaches this number">
              <input className="input" type="number" min="0" step="1" value={form.reorderLevel} onChange={set("reorderLevel")} />
            </Field>
            {form.category === "Medicine" && (
              <Field label="Expiry date">
                <input className="input" type="date" required value={form.expiryDate || ""} onChange={set("expiryDate")} />
              </Field>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" className="checkbox" checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active (can be sold)
            </label>
          </form>
        </Modal>
      )}

      {restockFor && (
        <Modal
          size="sm"
          title="Restock"
          subtitle={`${restockFor.name} · ${restockFor.stockQty} in stock now`}
          onClose={() => setRestockFor(null)}
          footer={
            <>
              <button type="button" onClick={() => setRestockFor(null)} className="btn btn-secondary">Cancel</button>
              <button form="restock-form" className="btn btn-primary">Add to stock</button>
            </>
          }
        >
          <form id="restock-form" onSubmit={restock} className="space-y-4">
            {formError && <Alert>{formError}</Alert>}
            <Field label="Quantity to add">
              <input className="input" type="number" min="1" step="1" required autoFocus
                value={restockQty} onChange={(e) => setRestockQty(e.target.value)} />
            </Field>
            {Number(restockQty) > 0 && (
              <p className="text-sm text-slate-600">
                New stock will be <b>{restockFor.stockQty + Number(restockQty)}</b>.
              </p>
            )}
          </form>
        </Modal>
      )}
    </Page>
  );
}
