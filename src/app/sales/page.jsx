"use client";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { useUser } from "@/components/AppShell";
import {
  Alert, Badge, EmptyRow, Icon, Page, PageHeader, STATUS_TONE, Toolbar, baht, fmtDateTime,
} from "@/components/ui";

const PAYMENTS = ["Cash", "Card", "QR transfer"];

export default function SalesPage() {
  const user = useUser();
  const [sales, setSales] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filters, setFilters] = useState({ date: "", status: "", paymentMethod: "", soldBy: "" });
  const [sellers, setSellers] = useState([]);
  const [openId, setOpenId] = useState(null); 
  const [error, setError] = useState("");

  async function load() {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    const res = await fetch(`/api/sales?${params}`);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setSales(data);
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, [filters]);

  useEffect(() => {
    fetch("/api/sales/sellers").then((r) => (r.ok ? r.json() : [])).then(setSellers);
  }, []);

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
  }

  async function remove(s) {
    if (!confirm(`Delete sale ${s.saleNo} permanently?`)) return;
    const res = await fetch(`/api/sales/${s._id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error);
    setError("");
    load();
  }

  const setFilter = (f) => (e) => setFilters({ ...filters, [f]: e.target.value });
  const completed = sales.filter((s) => s.status === "Completed");
  const totalAmount = completed.reduce((sum, s) => sum + s.total, 0);
  const hasFilters = filters.date || filters.status || filters.paymentMethod || filters.soldBy;

  return (
    <Page>
      <PageHeader
        title="Sales"
        description="Every checkout, with receipts. Voiding a sale puts the stock back."
        actions={
          <Link href="/checkout" className="btn btn-primary">
            <Icon name="cart" className="h-4 w-4" /> New sale
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Revenue{hasFilters ? " (filtered)" : ""}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{baht(totalAmount)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Completed sales</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{completed.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Voided</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{sales.length - completed.length}</p>
        </div>
      </div>

      <Toolbar>
        <input type="date" className="input sm:w-44" value={filters.date} onChange={setFilter("date")} aria-label="Date" />
        <select className="input sm:w-44" value={filters.status} onChange={setFilter("status")} aria-label="Status">
          <option value="">All statuses</option>
          <option>Completed</option>
          <option>Voided</option>
        </select>
        <select className="input sm:w-44" value={filters.paymentMethod} onChange={setFilter("paymentMethod")} aria-label="Payment">
          <option value="">All payments</option>
          {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select className="input sm:w-48" value={filters.soldBy} onChange={setFilter("soldBy")} aria-label="Sold by">
          <option value="">All staff</option>
          {sellers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => setFilters({ date: "", status: "", paymentMethod: "", soldBy: "" })} className="btn btn-ghost">
            <Icon name="x" className="h-4 w-4" /> Clear
          </button>
        )}
      </Toolbar>

      <Alert onClose={() => setError("")}>{error}</Alert>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Sale</th>
              <th>Customer</th>
              <th>Payment</th>
              <th className="text-right">Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <Fragment key={s._id}>
                <tr className={s.status === "Voided" ? "opacity-60" : ""}>
                  <td>
                    <div className="font-medium text-slate-900">{fmtDateTime(s.saleDate)}</div>
                    <div className="id-text">{s.saleNo}</div>
                  </td>
                  <td>
                    {s.patient ? (
                      <>
                        <div className="font-medium text-slate-900">{s.patient.firstName} {s.patient.lastName}</div>
                        <div className="id-text">{s.patient.patientNo}</div>
                      </>
                    ) : (
                      <span className="text-slate-500">Walk-in customer</span>
                    )}
                  </td>
                  <td>
                    <div>{s.paymentMethod}</div>
                    <div className="text-xs text-slate-500">by {s.soldBy?.name ?? "-"}</div>
                  </td>
                  <td className="text-right font-semibold text-slate-900">{baht(s.total)}</td>
                  <td><Badge tone={STATUS_TONE[s.status]} dot>{s.status}</Badge></td>
                  <td className="whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => setOpenId(openId === s._id ? null : s._id)} className="btn btn-secondary btn-sm">
                        <Icon name="receipt" className="h-3.5 w-3.5" /> {openId === s._id ? "Hide" : "Receipt"}
                      </button>
                      {s.status === "Completed" && (
                        <button onClick={() => voidSale(s)} className="btn-icon" title="Void sale" aria-label="Void sale">
                          <Icon name="ban" className="h-4 w-4" />
                        </button>
                      )}
                      {user?.role === "Admin" && s.status === "Voided" && (
                        <button onClick={() => remove(s)} className="btn-icon-danger" title="Delete" aria-label="Delete">
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {openId === s._id && (
                  <tr>
                    <td colSpan={6} className="!bg-slate-50 !px-4 !py-4">
                      <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-4">
                        <table className="w-full text-sm">
                          <tbody>
                            {s.items.map((it, i) => (
                              <tr key={i} className="border-b border-slate-100 last:border-0">
                                <td className="py-2">
                                  <div className="text-slate-800">{it.name}</div>
                                  <div className="id-text">{it.sku}</div>
                                </td>
                                <td className="py-2 text-right text-slate-500">{it.qty} × {baht(it.unitPrice)}</td>
                                <td className="w-28 py-2 text-right font-medium text-slate-900">{baht(it.qty * it.unitPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                          <p className="text-xs text-slate-500">
                            Sold by {s.soldBy?.name ?? "-"}
                            {s.voidedAt && ` · Voided ${fmtDateTime(s.voidedAt)}`}
                          </p>
                          <p className="text-base font-semibold text-slate-900">Total {baht(s.total)}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {loaded && sales.length === 0 && (
              <EmptyRow colSpan={6} icon="receipt" title="No sales found"
                hint={hasFilters ? "Try clearing the filters." : "Sales appear here after checkout."} />
            )}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
