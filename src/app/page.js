"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@/components/AppShell";
import DutyBoard from "@/components/DutyBoard";
import {
  Alert, Badge, EmptyRow, Icon, Page, PageHeader, StatCard, STATUS_TONE, baht, fmtDate, fmtTime,
} from "@/components/ui";

function greeting() {
  const h = Number(new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Bangkok" }));
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const user = useUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0); 

  useEffect(() => {
    fetch("/api/dashboard").then(async (r) => {
      const d = await r.json();
      setNow(Date.now());
      if (r.ok) setData(d);
      else setError(d.error);
    });
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok",
  });

  if (error) return <Page><Alert>{error}</Alert></Page>;

  const appts = data?.todayAppointments ?? [];
  const waiting = appts.filter((a) => a.status === "Scheduled").length;
  const readyForCheckout = appts.filter((a) => a.status === "Completed" && !a.checkedOutAt).length;

  return (
    <Page>
      <PageHeader
        title={`${greeting()}${user ? `, ${user.name.split(" ")[0]}` : ""}`}
        description={today}
        actions={
          <>
            <Link href="/patients?new=1" className="btn btn-secondary">
              <Icon name="user" className="h-4 w-4" /> Add patient
            </Link>
            <Link href="/appointments?new=1" className="btn btn-secondary">
              <Icon name="calendar" className="h-4 w-4" /> Book appointment
            </Link>
            <Link href="/checkout" className="btn btn-primary">
              <Icon name="cart" className="h-4 w-4" /> Open checkout
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Appointments today"
          value={data ? `${waiting} waiting` : "…"}
          hint={data ? `${appts.length} booked · ${data.upcomingCount} upcoming in total` : ""}
          icon="calendar"
          href="/appointments"
        />
        <StatCard
          label="Ready for checkout"
          value={data ? readyForCheckout : "…"}
          hint="Treated patients not yet paid"
          icon="cart"
          tone="violet"
          href="/checkout"
        />
        <StatCard
          label="Sales today"
          value={data ? baht(data.salesToday.total) : "…"}
          hint={data ? `${data.salesToday.count} completed sale${data.salesToday.count === 1 ? "" : "s"}` : ""}
          icon="wallet"
          tone="green"
          href="/sales"
        />
        <StatCard
          label="Low stock items"
          value={data ? data.lowStock.length : "…"}
          hint={data ? `${data.expired.length} expired medicine` : ""}
          icon="box"
          tone="amber"
          href="/products"
        />
      </div>

      {data && (
        <DutyBoard
          dayStart={data.dayStart}
          weekday={data.weekday}
          onDuty={data.onDuty}
          offToday={data.offToday}
          appointments={appts}
          now={now}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="table-wrap">
            <div className="card-header">
              <h2 className="card-title">Today&apos;s schedule</h2>
              <Link href="/appointments" className="text-sm font-medium text-brand-600 hover:text-brand-800">
                View all
              </Link>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {appts.map((a) => (
                  <tr key={a._id}>
                    <td className="font-medium text-slate-900">{fmtTime(a.dateTime)}</td>
                    <td>
                      <div className="font-medium text-slate-900">
                        {a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "(deleted)"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {a.reason}
                        {a.notes?.startsWith("Walk-in") && " · Walk-in"}
                      </div>
                    </td>
                    <td>{a.doctor ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : "(deleted)"}</td>
                    <td>
                      {a.checkedOutAt ? (
                        <Badge tone="violet" dot>Checked out</Badge>
                      ) : (
                        <Badge tone={STATUS_TONE[a.status]} dot>{a.status}</Badge>
                      )}
                    </td>
                    <td className="text-right">
                      {a.status !== "Cancelled" && !a.checkedOutAt && (
                        <Link href={`/checkout?appointment=${a._id}`} className="btn btn-secondary btn-sm">
                          Checkout
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {data && appts.length === 0 && (
                  <EmptyRow colSpan={5} icon="calendar" title="No appointments today" hint="Book one from the Appointments page." />
                )}
                {!data && (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">Loading…</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Low stock</h2>
              <Badge tone={data?.lowStock.length ? "amber" : "green"}>{data?.lowStock.length ?? 0}</Badge>
            </div>
            <ul className="divide-y divide-slate-100">
              {(data?.lowStock ?? []).map((p) => (
                <li key={p._id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{p.name}</p>
                    <p className="id-text">{p.sku}</p>
                  </div>
                  <span className="whitespace-nowrap text-amber-700">
                    <b>{p.stockQty}</b> <span className="text-xs text-slate-500">/ min {p.reorderLevel}</span>
                  </span>
                </li>
              ))}
              {data && data.lowStock.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-slate-500">All products are well stocked.</li>
              )}
            </ul>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Expired medicine</h2>
              <Badge tone={data?.expired.length ? "red" : "green"}>{data?.expired.length ?? 0}</Badge>
            </div>
            <ul className="divide-y divide-slate-100">
              {(data?.expired ?? []).map((p) => (
                <li key={p._id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{p.name}</p>
                    <p className="id-text">{p.sku}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-red-600">Expired {fmtDate(p.expiryDate)}</span>
                </li>
              ))}
              {data && data.expired.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-slate-500">Nothing has expired.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </Page>
  );
}
