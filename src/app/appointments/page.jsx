"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert, Badge, EmptyRow, Field, Icon, Modal, Page, PageHeader, STATUS_TONE, Toolbar, isTodayBangkok,
} from "@/components/ui";

const REASONS = ["Eye exam", "Follow-up", "Contact lens fitting", "Other"];
const STATUSES = ["Scheduled", "Completed", "Cancelled"];
const EMPTY = { patient: "", doctor: "", dateTime: "", reason: "Eye exam", status: "Scheduled", notes: "" };

function toLocalInput(iso) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// Today's date in Thailand as YYYY-MM-DD (en-CA formats dates that way)
const bangkokToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

const dayLabel = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const timeLabel = (iso) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default function AppointmentsPage() {
  return (
    <Suspense fallback={null}>
      <Appointments />
    </Suspense>
  );
}

function Appointments() {
  const router = useRouter();
  const params = useSearchParams();
  const [appointments, setAppointments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filters, setFilters] = useState({ date: "", doctor: "", status: "" });
  const [form, setForm] = useState(null); // null = form hidden
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  async function load() {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    const res = await fetch(`/api/appointments?${qs}`);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setAppointments(data);
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, [filters]);

  useEffect(() => {
    fetch("/api/patients").then((r) => (r.ok ? r.json() : [])).then(setPatients);
    fetch("/api/doctors").then((r) => (r.ok ? r.json() : [])).then(setDoctors);
  }, []);

  // Opened from the dashboard or a patient page: /appointments?new=1&doctor=<id>&time=<iso>&patient=<id>
  useEffect(() => {
    if (params.get("new") !== "1") return;
    const time = params.get("time");
    setFormError("");
    setForm({
      ...EMPTY,
      patient: params.get("patient") || "",
      doctor: params.get("doctor") || "",
      dateTime: time ? toLocalInput(time) : "",
    });
    router.replace("/appointments", { scroll: false });
  }, [params, router]);

  function openNew() {
    setFormError("");
    setForm({ ...EMPTY });
  }

  function openEdit(a) {
    setFormError("");
    setForm({
      _id: a._id,
      appointmentNo: a.appointmentNo,
      patient: a.patient?._id ?? "",
      doctor: a.doctor?._id ?? "",
      dateTime: toLocalInput(a.dateTime),
      reason: a.reason,
      status: a.status,
      notes: a.notes ?? "",
    });
  }

  async function save(e) {
    e.preventDefault();
    const isEdit = Boolean(form._id);
    const res = await fetch(isEdit ? `/api/appointments/${form._id}` : "/api/appointments", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient: form.patient,
        doctor: form.doctor,
        dateTime: new Date(form.dateTime).toISOString(),
        reason: form.reason,
        status: form.status,
        notes: form.notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) return setFormError(data.error);
    setForm(null);
    load();
  }

  async function fillNextSlot(walkin) {
    if (!form.doctor) return setFormError("Choose a doctor first");
    const res = await fetch(`/api/appointments/next-slot?doctor=${form.doctor}${walkin ? "&walkin=1" : ""}`);
    const data = await res.json();
    if (!res.ok) return setFormError(data.error);
    setFormError("");
    setForm({
      ...form,
      dateTime: toLocalInput(data.dateTime),
      ...(walkin ? { reason: "Other", notes: "Walk-in" } : {}),
    });
  }

  async function setStatus(a, status) {
    const res = await fetch(`/api/appointments/${a._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return setError((await res.json()).error);
    setError("");
    load();
  }

  async function remove(a) {
    if (!confirm(`Delete appointment ${a.appointmentNo}?`)) return;
    const res = await fetch(`/api/appointments/${a._id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error);
    setError("");
    load();
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setFilter = (field) => (e) => setFilters({ ...filters, [field]: e.target.value });
  const today = bangkokToday();

  // New bookings: only active doctors (but keep the current one when editing)
  const bookableDoctors = form ? doctors.filter((d) => d.isActive || d._id === form.doctor) : [];
  const hasFilters = filters.date || filters.doctor || filters.status;

  return (
    <Page>
      <PageHeader
        title="Appointments"
        description="Book visits, register walk-ins and track who has been seen."
        actions={
          <button onClick={openNew} className="btn btn-primary">
            <Icon name="plus" className="h-4 w-4" /> Book appointment
          </button>
        }
      />

      <Toolbar>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setFilters({ ...filters, date: today })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${filters.date === today ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, date: "" })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${!filters.date ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
          >
            All dates
          </button>
        </div>
        <input type="date" className="input sm:w-44" value={filters.date} onChange={setFilter("date")} aria-label="Date" />
        <select className="input sm:w-56" value={filters.doctor} onChange={setFilter("doctor")} aria-label="Doctor">
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d._id} value={d._id}>Dr. {d.firstName} {d.lastName}</option>
          ))}
        </select>
        <select className="input sm:w-44" value={filters.status} onChange={setFilter("status")} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => setFilters({ date: "", doctor: "", status: "" })} className="btn btn-ghost">
            <Icon name="x" className="h-4 w-4" /> Clear
          </button>
        )}
      </Toolbar>

      <Alert onClose={() => setError("")}>{error}</Alert>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Reason</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => {
              const walkIn = a.notes?.startsWith("Walk-in");
              const canCheckout = a.status !== "Cancelled" && !a.checkedOutAt && isTodayBangkok(a.dateTime);
              return (
                <tr key={a._id}>
                  <td className="whitespace-nowrap">
                    <div className="font-medium text-slate-900">{timeLabel(a.dateTime)}</div>
                    <div className="text-xs text-slate-500">{dayLabel(a.dateTime)}</div>
                  </td>
                  <td>
                    <div className="font-medium text-slate-900">
                      {a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "(deleted)"}
                    </div>
                    <div className="id-text">{a.appointmentNo}</div>
                  </td>
                  <td>{a.doctor ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : "(deleted)"}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {a.reason}
                      {walkIn && <Badge tone="amber">Walk-in</Badge>}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={STATUS_TONE[a.status]} dot>{a.status}</Badge>
                      {a.checkedOutAt && <Badge tone="violet">Checked out</Badge>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-1">
                      {a.status === "Scheduled" && (
                        <button onClick={() => setStatus(a, "Completed")} className="btn btn-secondary btn-sm" title="Mark as seen">
                          <Icon name="check" className="h-3.5 w-3.5 text-emerald-600" /> Done
                        </button>
                      )}
                      {canCheckout && (
                        <Link href={`/checkout?appointment=${a._id}`} className="btn btn-secondary btn-sm">
                          <Icon name="cart" className="h-3.5 w-3.5 text-brand-600" /> Checkout
                        </Link>
                      )}
                      {a.status === "Scheduled" && (
                        <button onClick={() => setStatus(a, "Cancelled")} className="btn-icon" title="Cancel appointment" aria-label="Cancel appointment">
                          <Icon name="ban" className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => openEdit(a)} className="btn-icon" title="Edit" aria-label="Edit">
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(a)} className="btn-icon-danger" title="Delete" aria-label="Delete">
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {loaded && appointments.length === 0 && (
              <EmptyRow colSpan={6} icon="calendar" title="No appointments found"
                hint={hasFilters ? "Try clearing the filters." : "Book the first appointment."} />
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal
          size="lg"
          title={form._id ? "Edit appointment" : "Book appointment"}
          subtitle={form._id ? form.appointmentNo : "Pick a patient and doctor, then a time or use Walk-in."}
          onClose={() => setForm(null)}
          footer={
            <>
              <button type="button" onClick={() => setForm(null)} className="btn btn-secondary">Cancel</button>
              <button form="appointment-form" className="btn btn-primary">
                {form._id ? "Save changes" : "Book appointment"}
              </button>
            </>
          }
        >
          <form id="appointment-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {formError && <div className="sm:col-span-2"><Alert>{formError}</Alert></div>}

            <Field label="Patient">
              <select className="input" required value={form.patient} onChange={set("patient")}>
                <option value="">Select patient…</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.firstName} {p.lastName} · {p.patientNo}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Doctor">
              <select className="input" required value={form.doctor} onChange={set("doctor")}>
                <option value="">Select doctor…</option>
                {bookableDoctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    Dr. {d.firstName} {d.lastName} · {d.specialty} ({(d.workingDays || []).join(", ")})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Date & time" span hint="30-minute slots. Next free finds the earliest open slot; Walk-in adds the patient to today's queue.">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input type="datetime-local" className="input" required step={1800}
                  value={form.dateTime} onChange={set("dateTime")} />
                <button type="button" onClick={() => fillNextSlot(false)} className="btn btn-secondary">
                  <Icon name="clock" className="h-4 w-4" /> Next free
                </button>
                <button type="button" onClick={() => fillNextSlot(true)} className="btn btn-warning">
                  <Icon name="walk" className="h-4 w-4" /> Walk-in
                </button>
              </div>
            </Field>

            <Field label="Reason">
              <select className="input" value={form.reason} onChange={set("reason")}>
                {REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>

            {form._id ? (
              <Field label="Status">
                <select className="input" value={form.status} onChange={set("status")}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            ) : (
              <div />
            )}

            <Field label="Notes" span>
              <textarea className="input min-h-[80px]" value={form.notes} onChange={set("notes")} />
            </Field>
          </form>
        </Modal>
      )}
    </Page>
  );
}
