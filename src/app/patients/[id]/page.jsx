"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import {
  Alert, Avatar, Badge, EmptyRow, Icon, Page, STATUS_TONE, ageFrom, baht, fmtDate, fmtDateTime, isTodayBangkok,
} from "@/components/ui";

export default function PatientDetailPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState(null);
  const [sales, setSales] = useState(null);
  const [openSale, setOpenSale] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const get = (url) => fetch(url).then(async (r) => ({ ok: r.ok, data: await r.json() }));
    Promise.all([
      get(`/api/patients/${id}`),
      get(`/api/appointments?patient=${id}`),
      get(`/api/sales?patient=${id}`),
    ]).then(([p, a, s]) => {
      if (!p.ok) return setError(p.data.error || "Patient not found");
      setPatient(p.data);
      setAppointments(a.ok ? [...a.data].reverse() : []); // newest first
      setSales(s.ok ? s.data : []);
    });
  }, [id]);

  if (error) {
    return (
      <Page>
        <BackLink />
        <Alert>{error}</Alert>
      </Page>
    );
  }
  if (!patient) return <Page><p className="text-slate-500">Loading patient…</p></Page>;

  const name = `${patient.firstName} ${patient.lastName}`;
  const now = new Date();
  const visits = appointments ?? [];
  const seen = visits.filter((a) => a.status === "Completed");
  const upcoming = visits.filter((a) => a.status === "Scheduled" && new Date(a.dateTime) >= now);
  const completedSales = (sales ?? []).filter((s) => s.status === "Completed");
  const spent = completedSales.reduce((sum, s) => sum + s.total, 0);
  const lastVisit = seen.length ? seen[0].dateTime : null;
  const openVisit = visits.find((a) => a.status !== "Cancelled" && !a.checkedOutAt && isTodayBangkok(a.dateTime));

  return (
    <Page>
      <BackLink />

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar name={name} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{name}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              <span className="font-mono">{patient.patientNo}</span> · registered {fmtDate(patient.createdAt)}
            </p>
            {patient.medicalNotes && (
              <div className="mt-3 inline-flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                {patient.medicalNotes}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {openVisit && (
              <Link href={`/checkout?appointment=${openVisit._id}`} className="btn btn-secondary">
                <Icon name="cart" className="h-4 w-4" /> Checkout today&apos;s visit
              </Link>
            )}
            <Link href={`/appointments?new=1&patient=${patient._id}`} className="btn btn-primary">
              <Icon name="calendar" className="h-4 w-4" /> Book appointment
            </Link>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Date of birth" value={`${fmtDate(patient.dateOfBirth)} (${ageFrom(patient.dateOfBirth)} years)`} />
          <Info label="Gender" value={patient.gender || "-"} />
          <Info label="Phone" value={patient.phone} />
          <Info label="Email" value={patient.email || "-"} />
          <div className="sm:col-span-2 lg:col-span-4">
            <Info label="Address" value={patient.address || "-"} />
          </div>
        </dl>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Visits seen" value={seen.length} />
        <Summary label="Upcoming" value={upcoming.length} />
        <Summary label="Last visit" value={lastVisit ? fmtDate(lastVisit) : "-"} />
        <Summary label="Total spent" value={baht(spent)} />
      </div>

      {/* Appointment history */}
      <div className="table-wrap">
        <div className="card-header">
          <h2 className="card-title">Appointment history</h2>
          <span className="text-xs text-slate-500">{visits.length} total</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Doctor</th>
              <th>Reason</th>
              <th>Notes</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visits.map((a) => (
              <tr key={a._id}>
                <td className="whitespace-nowrap">
                  <div className="font-medium text-slate-900">{fmtDateTime(a.dateTime)}</div>
                  <div className="id-text">{a.appointmentNo}</div>
                </td>
                <td>{a.doctor ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : "(deleted)"}</td>
                <td>{a.reason}</td>
                <td className="max-w-[240px] truncate text-slate-500" title={a.notes}>{a.notes || "-"}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={STATUS_TONE[a.status]} dot>{a.status}</Badge>
                    {a.checkedOutAt && <Badge tone="violet">Checked out</Badge>}
                  </div>
                </td>
              </tr>
            ))}
            {visits.length === 0 && (
              <EmptyRow colSpan={5} icon="calendar" title="No appointments yet" />
            )}
          </tbody>
        </table>
      </div>

      {/* Purchases */}
      <div className="table-wrap">
        <div className="card-header">
          <h2 className="card-title">Purchases</h2>
          <span className="text-xs text-slate-500">{completedSales.length} completed · {baht(spent)}</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Items</th>
              <th>Payment</th>
              <th className="text-right">Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(sales ?? []).map((s) => (
              <Fragment key={s._id}>
                <tr className={`cursor-pointer ${s.status === "Voided" ? "opacity-60" : ""}`}
                  onClick={() => setOpenSale(openSale === s._id ? null : s._id)}>
                  <td className="whitespace-nowrap">
                    <div className="font-medium text-slate-900">{fmtDateTime(s.saleDate)}</div>
                    <div className="id-text">{s.saleNo}</div>
                  </td>
                  <td className="max-w-[280px] truncate">
                    {s.items.map((it) => `${it.qty}× ${it.name}`).join(", ")}
                  </td>
                  <td>{s.paymentMethod}</td>
                  <td className="text-right font-semibold text-slate-900">{baht(s.total)}</td>
                  <td><Badge tone={STATUS_TONE[s.status]} dot>{s.status}</Badge></td>
                </tr>
                {openSale === s._id && (
                  <tr>
                    <td colSpan={5} className="!bg-slate-50">
                      <ul className="mx-auto max-w-lg space-y-1 text-sm">
                        {s.items.map((it, i) => (
                          <li key={i} className="flex justify-between gap-4">
                            <span>{it.qty} × {it.name} <span className="id-text">{it.sku}</span></span>
                            <span>{baht(it.qty * it.unitPrice)}</span>
                          </li>
                        ))}
                        <li className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
                          <span>Sold by {s.soldBy?.name ?? "-"}</span>
                          <span>{baht(s.total)}</span>
                        </li>
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {sales && sales.length === 0 && (
              <EmptyRow colSpan={5} icon="receipt" title="No purchases yet" />
            )}
          </tbody>
        </table>
      </div>
    </Page>
  );
}

function BackLink() {
  return (
    <Link href="/patients" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
      <span className="rotate-180"><Icon name="arrowRight" className="h-4 w-4" /></span> All patients
    </Link>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}
