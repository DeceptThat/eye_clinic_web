"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const baht = (n) => `฿${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const time = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const STATUS_COLOR = { Scheduled: "text-sky-400", Completed: "text-green-500", Cancelled: "text-gray-500" };

function Stat({ label, value, href, warn }) {
  return (
    <Link href={href} className={`border rounded p-4 block ${warn ? "border-amber-500" : "border-gray-700"}`}>
      <div className="text-sm text-gray-400">{label}</div>
      <div className={`text-3xl font-bold ${warn ? "text-amber-500" : ""}`}>{value}</div>
    </Link>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (r) => ((r.ok ? setData : (d) => setError(d.error))(await r.json())));
  }, []);

  if (error) return <main className="p-6 text-red-600">{error}</main>;
  if (!data) return <main className="p-6 text-gray-400">Loading…</main>;

  const waiting = data.todayAppointments.filter((a) => a.status === "Scheduled").length;

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Today</h1>

      <div className="grid grid-cols-4 gap-4">
        <Stat label="Appointments today" value={`${waiting} / ${data.todayAppointments.length}`} href="/appointments" />
        <Stat label={`Sales today (${data.salesToday.count})`} value={baht(data.salesToday.total)} href="/sales" />
        <Stat label="Low stock items" value={data.lowStock.length} href="/products" warn={data.lowStock.length > 0} />
        <Stat label="Upcoming appointments" value={data.upcomingCount} href="/appointments" />
      </div>

      <section>
        <h2 className="font-semibold mb-2">Today&apos;s appointments</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-800 text-gray-100 text-left">
              <th className="p-2">Time</th>
              <th className="p-2">Patient</th>
              <th className="p-2">Doctor</th>
              <th className="p-2">Reason</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.todayAppointments.map((a) => (
              <tr key={a._id} className="border-b">
                <td className="p-2">{time(a.dateTime)}</td>
                <td className="p-2">{a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "(deleted)"}</td>
                <td className="p-2">{a.doctor ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : "(deleted)"}</td>
                <td className="p-2">{a.reason}{a.notes?.startsWith("Walk-in") && " · Walk-in"}</td>
                <td className={`p-2 ${STATUS_COLOR[a.status]}`}>{a.status}</td>
              </tr>
            ))}
            {data.todayAppointments.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">No appointments today</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="grid grid-cols-2 gap-6">
        <section>
          <h2 className="font-semibold mb-2">Low stock</h2>
          {data.lowStock.length === 0 ? (
            <p className="text-gray-500">All products are well stocked.</p>
          ) : (
            <ul className="space-y-1">
              {data.lowStock.map((p) => (
                <li key={p._id} className="flex justify-between border-b border-gray-800 py-1">
                  <span><span className="font-mono text-sm">{p.sku}</span> {p.name}</span>
                  <span className="text-amber-500">{p.stockQty} left (min {p.reorderLevel})</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="font-semibold mb-2">Expired medicine</h2>
          {data.expired.length === 0 ? (
            <p className="text-gray-500">Nothing expired.</p>
          ) : (
            <ul className="space-y-1">
              {data.expired.map((p) => (
                <li key={p._id} className="flex justify-between border-b border-gray-800 py-1">
                  <span><span className="font-mono text-sm">{p.sku}</span> {p.name}</span>
                  <span className="text-red-500">expired {p.expiryDate.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
