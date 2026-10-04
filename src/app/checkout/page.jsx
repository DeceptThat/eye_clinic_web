"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/components/AppShell";
import {
  Alert, Avatar, Badge, Icon, Page, PageHeader, SearchInput, baht, fmtDateTime, fmtTime,
} from "@/components/ui";

const PAYMENTS = [
  { value: "Cash", icon: "wallet" },
  { value: "Card", icon: "card" },
  { value: "QR transfer", icon: "qr" },
];
const CATEGORY_TONE = { Glasses: "blue", Medicine: "violet", Accessory: "gray" };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<Page><p className="text-slate-500">Loading checkout…</p></Page>}>
      <Checkout />
    </Suspense>
  );
}

function Checkout() {
  const user = useUser();
  const params = useSearchParams();
  const wantedAppointment = params.get("appointment");

  const [queue, setQueue] = useState([]);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [products, setProducts] = useState([]);
  const [patients, setPatients] = useState([]);

  const [selected, setSelected] = useState(null); // { type: "visit", appt } | { type: "walkin", patient }
  const [cart, setCart] = useState([]); // [{ product: id, qty }]
  const [payment, setPayment] = useState("Cash");
  const [q, setQ] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadQueue() {
    const res = await fetch("/api/checkout");
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setQueue(data);
    setQueueLoaded(true);
    return data;
  }

  async function loadProducts() {
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
  }

  useEffect(() => {
    loadProducts();
    fetch("/api/patients").then((r) => (r.ok ? r.json() : [])).then(setPatients);
    loadQueue().then((data) => {
      if (!wantedAppointment || !data) return;
      const appt = data.find((a) => a._id === wantedAppointment);
      if (appt) setSelected({ type: "visit", appt });
      else setError("That visit is not waiting for checkout (it may already be paid, cancelled or not today).");
    });
  }, [wantedAppointment]);

  // --- selection ---------------------------------------------------
  function selectVisit(appt) {
    setReceipt(null);
    setNotice("");
    setError("");
    setCart([]);
    setSelected({ type: "visit", appt });
  }

  function startWalkIn() {
    setReceipt(null);
    setNotice("");
    setError("");
    setCart([]);
    setSelected({ type: "walkin", patient: "" });
  }

  // --- cart ----------------------------------------------------------
  const sellable = products.filter(
    (p) => p.isActive && p.stockQty > 0 && !(p.expiryDate && new Date(p.expiryDate) < new Date())
  );
  const productById = (id) => products.find((p) => p._id === id);
  const term = q.trim().toLowerCase();
  const shown = term
    ? sellable.filter((p) => `${p.name} ${p.sku} ${p.brand || ""}`.toLowerCase().includes(term))
    : sellable;

  const qtyInCart = (id) => cart.find((c) => c.product === id)?.qty ?? 0;

  function addToCart(p) {
    if (qtyInCart(p._id) >= p.stockQty) return;
    setCart((c) =>
      c.some((line) => line.product === p._id)
        ? c.map((line) => (line.product === p._id ? { ...line, qty: line.qty + 1 } : line))
        : [...c, { product: p._id, qty: 1 }]
    );
  }

  function setQty(id, qty) {
    const p = productById(id);
    const max = p?.stockQty ?? 1;
    const n = Math.max(1, Math.min(max, Number(qty) || 1));
    setCart((c) => c.map((line) => (line.product === id ? { ...line, qty: n } : line)));
  }

  const removeLine = (id) => setCart((c) => c.filter((line) => line.product !== id));

  const total = cart.reduce((sum, line) => sum + (productById(line.product)?.price ?? 0) * line.qty, 0);
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);

  // --- actions -------------------------------------------------------
  async function completeSale() {
    if (!selected || cart.length === 0) return;
    setBusy(true);
    const body = {
      paymentMethod: payment,
      items: cart.map((line) => ({ product: line.product, qty: line.qty })),
    };
    if (selected.type === "visit") body.appointment = selected.appt._id;
    else if (selected.patient) body.patient = selected.patient;

    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);

    setError("");
    setReceipt({
      ...data,
      doctor: selected.type === "visit" ? selected.appt.doctor : null,
    });
    setCart([]);
    setSelected(null);
    loadQueue();
    loadProducts();
  }

  async function closeWithoutPurchase() {
    if (selected?.type !== "visit") return;
    const { appt } = selected;
    if (!confirm(`Close ${appt.patient?.firstName}'s visit without a purchase?`)) return;
    const res = await fetch(`/api/appointments/${appt._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Completed", checkedOutAt: new Date().toISOString() }),
    });
    if (!res.ok) return setError((await res.json()).error);
    setError("");
    setNotice(`${appt.patient?.firstName} ${appt.patient?.lastName} checked out with no purchase.`);
    setSelected(null);
    setCart([]);
    loadQueue();
  }

  const ready = queue.filter((a) => a.status === "Completed");
  const waiting = queue.filter((a) => a.status === "Scheduled");

  return (
    <Page wide>
      <PageHeader
        title="Checkout"
        description="Charge patients after their visit, or sell to walk-in customers."
        actions={
          <button onClick={startWalkIn} className="btn btn-secondary">
            <Icon name="walk" className="h-4 w-4" /> Walk-in customer
          </button>
        }
      />

      <Alert onClose={() => setError("")}>{error}</Alert>
      {notice && <Alert tone="green" onClose={() => setNotice("")}>{notice}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        {/* ---------------- Queue ---------------- */}
        <aside className="card h-fit">
          <div className="card-header">
            <h2 className="card-title">Today&apos;s visits</h2>
            <button onClick={loadQueue} className="btn-icon" title="Refresh" aria-label="Refresh">
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2">
            <QueueSection title="Ready to pay" items={ready} selected={selected} onSelect={selectVisit} tone="green" />
            <QueueSection title="Still with doctor / waiting" items={waiting} selected={selected} onSelect={selectVisit} tone="blue" />
            {queueLoaded && queue.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-slate-500">
                No visits waiting for checkout today.
              </p>
            )}
          </div>
        </aside>

        {/* ---------------- Middle: customer + products ---------------- */}
        <section className={`min-w-0 space-y-6 ${selected && !receipt ? "" : "xl:col-span-2"}`}>
          {receipt ? (
            <Receipt receipt={receipt} cashier={user?.name} onNext={() => setReceipt(null)} />
          ) : !selected ? (
            <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Icon name="cart" className="h-7 w-7" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Start a checkout</h2>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Pick a patient from today&apos;s visits, or start a sale for a walk-in customer who only wants to buy something.
              </p>
              <button onClick={startWalkIn} className="btn btn-primary mt-6">
                <Icon name="walk" className="h-4 w-4" /> Walk-in customer
              </button>
            </div>
          ) : (
            <>
              <CustomerCard
                selected={selected}
                patients={patients}
                onPatient={(id) => setSelected({ ...selected, patient: id })}
                onClear={() => { setSelected(null); setCart([]); }}
              />

              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Add products</h2>
                  <span className="text-xs text-slate-500">{sellable.length} available</span>
                </div>
                <div className="space-y-4 p-4">
                  <SearchInput placeholder="Search glasses, medicine, accessories or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
                  <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                    {shown.map((p) => {
                      const inCart = qtyInCart(p._id);
                      const left = p.stockQty - inCart;
                      return (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => addToCart(p)}
                          disabled={left <= 0}
                          className={`group flex flex-col rounded-xl border p-3 text-left transition ${
                            inCart
                              ? "border-brand-300 bg-brand-50/60"
                              : "border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium leading-snug text-slate-900">{p.name}</span>
                            {inCart > 0 && (
                              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">
                                {inCart}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="id-text">{p.sku}</span>
                            <Badge tone={CATEGORY_TONE[p.category]}>{p.category}</Badge>
                          </div>
                          <div className="mt-3 flex items-end justify-between">
                            <span className="text-base font-semibold text-slate-900">{baht(p.price)}</span>
                            <span className={`text-xs ${left <= p.reorderLevel ? "text-amber-700" : "text-slate-500"}`}>
                              {left} left
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    {shown.length === 0 && (
                      <p className="col-span-full py-8 text-center text-sm text-slate-500">No products match.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ---------------- Right: cart + payment ---------------- */}
        {selected && !receipt && (
          <aside className="card h-fit lg:col-start-2 xl:col-start-auto xl:sticky xl:top-6">
            <div className="card-header">
              <h2 className="card-title">Order</h2>
              <span className="text-xs text-slate-500">{itemCount} item{itemCount === 1 ? "" : "s"}</span>
            </div>

            <div className="divide-y divide-slate-100">
              {cart.map((line) => {
                const p = productById(line.product);
                if (!p) return null;
                return (
                  <div key={line.product} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{baht(p.price)} each</p>
                    </div>
                    <div className="flex items-center rounded-lg border border-slate-300">
                      <button type="button" className="px-2 py-1 text-slate-500 hover:text-slate-900" onClick={() => setQty(line.product, line.qty - 1)} aria-label="Less">
                        <Icon name="minus" className="h-3.5 w-3.5" />
                      </button>
                      <input
                        className="w-9 border-x border-slate-300 py-1 text-center text-sm focus:outline-none"
                        value={line.qty}
                        onChange={(e) => setQty(line.product, e.target.value)}
                        aria-label="Quantity"
                      />
                      <button type="button" className="px-2 py-1 text-slate-500 hover:text-slate-900" onClick={() => setQty(line.product, line.qty + 1)} aria-label="More">
                        <Icon name="plus" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="w-20 text-right text-sm font-semibold text-slate-900">{baht(p.price * line.qty)}</span>
                    <button type="button" onClick={() => removeLine(line.product)} className="btn-icon-danger h-7 w-7" aria-label="Remove">
                      <Icon name="x" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
              {cart.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-slate-500">Click products to add them here.</p>
              )}
            </div>

            <div className="space-y-4 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total</span>
                <span className="text-2xl font-semibold tracking-tight text-slate-900">{baht(total)}</span>
              </div>

              <div>
                <p className="label">Payment method</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENTS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setPayment(m.value)}
                      aria-pressed={payment === m.value}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                        payment === m.value
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon name={m.icon} className="h-4 w-4" />
                      {m.value}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">Recorded only; take payment at the counter.</p>
              </div>

              <button onClick={completeSale} disabled={busy || cart.length === 0} className="btn btn-primary w-full py-2.5 text-base">
                <Icon name="check" className="h-4 w-4" />
                {busy ? "Saving…" : `Complete checkout · ${baht(total)}`}
              </button>

              {selected.type === "visit" && (
                <button onClick={closeWithoutPurchase} className="btn btn-ghost w-full">
                  Close visit without purchase
                </button>
              )}
            </div>
          </aside>
        )}
      </div>
    </Page>
  );
}

function QueueSection({ title, items, selected, onSelect, tone }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-2">
      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title} · {items.length}
      </p>
      <ul className="space-y-1">
        {items.map((a) => {
          const active = selected?.type === "visit" && selected.appt._id === a._id;
          const name = a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "(deleted patient)";
          return (
            <li key={a._id}>
              <button
                type="button"
                onClick={() => onSelect(a)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  active ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-slate-50"
                }`}
              >
                <Avatar name={name} size="sm" tone={tone === "green" ? "green" : "brand"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {fmtTime(a.dateTime)} · Dr. {a.doctor?.lastName ?? "-"}
                    {a.notes?.startsWith("Walk-in") && " · Walk-in"}
                  </p>
                </div>
                <Icon name="arrowRight" className={`h-4 w-4 ${active ? "text-brand-600" : "text-slate-300"}`} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CustomerCard({ selected, patients, onPatient, onClear }) {
  if (selected.type === "walkin") {
    return (
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Icon name="walk" />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">Walk-in customer</p>
          <p className="text-sm text-slate-500">Optionally link the sale to a registered patient.</p>
        </div>
        <select className="input sm:w-72" value={selected.patient} onChange={(e) => onPatient(e.target.value)} aria-label="Patient">
          <option value="">No patient (anonymous)</option>
          {patients.map((p) => (
            <option key={p._id} value={p._id}>{p.firstName} {p.lastName} · {p.patientNo}</option>
          ))}
        </select>
        <button onClick={onClear} className="btn-icon" aria-label="Clear"><Icon name="x" /></button>
      </div>
    );
  }

  const { appt } = selected;
  const p = appt.patient;
  const name = p ? `${p.firstName} ${p.lastName}` : "(deleted patient)";
  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <Avatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-slate-900">{name}</p>
            <Badge tone={appt.status === "Completed" ? "green" : "blue"} dot>
              {appt.status === "Completed" ? "Seen by doctor" : "Not marked done yet"}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            {p?.patientNo} {p?.phone && `· ${p.phone}`}
          </p>
        </div>
        <button onClick={onClear} className="btn-icon" aria-label="Clear"><Icon name="x" /></button>
      </div>
      <dl className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Doctor</dt>
          <dd className="font-medium text-slate-900">
            {appt.doctor ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}` : "-"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Visit</dt>
          <dd className="font-medium text-slate-900">{appt.reason}{appt.notes?.startsWith("Walk-in") && " (walk-in)"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Time</dt>
          <dd className="font-medium text-slate-900">{fmtTime(appt.dateTime)}</dd>
        </div>
        {p?.medicalNotes && (
          <div className="sm:col-span-3">
            <dt className="text-slate-500">Medical notes</dt>
            <dd className="text-slate-800">{p.medicalNotes}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function Receipt({ receipt, cashier, onNext }) {
  return (
    <div className="space-y-4">
      <Alert tone="green">Checkout complete. Stock has been updated.</Alert>
      <div className="print-area card mx-auto max-w-lg p-8">
        <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Icon name="eye" strokeWidth={2} />
            </span>
            <div>
              <p className="font-semibold text-slate-900">Eye Clinic</p>
              <p className="text-xs text-slate-500">Receipt</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm text-slate-900">{receipt.saleNo}</p>
            <p className="text-xs text-slate-500">{fmtDateTime(receipt.saleDate)}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 py-4 text-sm">
          <dt className="text-slate-500">Customer</dt>
          <dd className="text-right text-slate-900">
            {receipt.patient ? `${receipt.patient.firstName} ${receipt.patient.lastName} (${receipt.patient.patientNo})` : "Walk-in customer"}
          </dd>
          {receipt.doctor && (
            <>
              <dt className="text-slate-500">Doctor</dt>
              <dd className="text-right text-slate-900">Dr. {receipt.doctor.firstName} {receipt.doctor.lastName}</dd>
            </>
          )}
          <dt className="text-slate-500">Served by</dt>
          <dd className="text-right text-slate-900">{receipt.soldBy?.name ?? cashier ?? "-"}</dd>
        </dl>

        <table className="w-full border-y border-dashed border-slate-300 text-sm">
          <tbody>
            {receipt.items.map((it, i) => (
              <tr key={i}>
                <td className="py-2 pr-2">
                  <div className="text-slate-900">{it.name}</div>
                  <div className="text-xs text-slate-500">{it.qty} × {baht(it.unitPrice)}</div>
                </td>
                <td className="py-2 text-right font-medium text-slate-900">{baht(it.qty * it.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-slate-500">Paid by {receipt.paymentMethod}</span>
          <span className="text-2xl font-semibold text-slate-900">{baht(receipt.total)}</span>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Thank you for visiting. Please keep this receipt.</p>
      </div>

      <div className="no-print flex justify-center gap-2">
        <button onClick={() => window.print()} className="btn btn-secondary">
          <Icon name="printer" className="h-4 w-4" /> Print receipt
        </button>
        <button onClick={onNext} className="btn btn-primary">
          Next customer <Icon name="arrowRight" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
