"use client";
import { useEffect, useState } from "react";

const REASONS = ["Eye exam", "Follow-up", "Contact lens fitting", "Other"];
const STATUSES = ["Scheduled", "Completed", "Cancelled"];
const STATUS_COLOR = {
  Scheduled: "text-sky-400",
  Completed: "text-green-500",
  Cancelled: "text-gray-500",
};
const EMPTY = { patient: "", doctor: "", dateTime: "", reason: "Eye exam", status: "Scheduled", notes: "" };

function toLocalInput(iso) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fmt(iso) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filters, setFilters] = useState({ date: "", doctor: "", status: "" });
  const [form, setForm] = useState(null); // null = form hidden
  const [error, setError] = useState("");

  async function load() {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    const res = await fetch(`/api/appointments?${params}`);
    setAppointments(await res.json());
  }

  useEffect(() => {
    load();
  }, [filters]);

  useEffect(() => {
    fetch("/api/patients").then((r) => r.json()).then(setPatients);
    fetch("/api/doctors").then((r) => r.json()).then(setDoctors);
  }, []);

  function openNew() {
    setError("");
    setForm({ ...EMPTY });
  }

  function openEdit(a) {
    setError("");
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
    // Copy first: if save reads form.x directly, the React Compiler checks form.x
    // on every render, which crashes while form is null (form hidden)
    const f = { ...form };
    const isEdit = Boolean(f._id);
    const res = await fetch(isEdit ? `/api/appointments/${f._id}` : "/api/appointments", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient: f.patient,
        doctor: f.doctor,
        dateTime: new Date(f.dateTime).toISOString(),
        reason: f.reason,
        status: f.status,
        notes: f.notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setForm(null);
    setError("");
    load();
  }

  async function fillNextSlot() {
    if (!form.doctor) return setError("Choose a doctor first");
    const res = await fetch(`/api/appointments/next-slot?doctor=${form.doctor}`);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setError("");
    setForm({ ...form, dateTime: toLocalInput(data.dateTime) });
  }

  async function walkIn() {
    if (!form.doctor) return setError("Choose a doctor first");
    const res = await fetch(`/api/appointments/next-slot?doctor=${form.doctor}&walkin=1`);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setError("");
    setForm({ ...form, dateTime: toLocalInput(data.dateTime), reason: "Other", notes: "Walk-in" });
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
    load();
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setFilter = (field) => (e) => setFilters({ ...filters, [field]: e.target.value });
  const input = "border rounded px-3 py-2 w-full";

  // New bookings: only active doctors (but keep the current one when editing)
  const bookableDoctors = form
  ? doctors.filter((d) => d && (d.isActive || d._id === form.doctor))
  : [];

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <button onClick={openNew} className="bg-teal-700 text-white px-4 py-2 rounded">
          + Book appointment
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <input type="date" className={input} value={filters.date} onChange={setFilter("date")} />
        <select className={input} value={filters.doctor} onChange={setFilter("doctor")}>
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d._id} value={d._id}>Dr. {d.firstName} {d.lastName}</option>
          ))}
        </select>
        <select className={input} value={filters.status} onChange={setFilter("status")}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button
          onClick={() => setFilters({ date: "", doctor: "", status: "" })}
          className="border rounded px-3 py-2"
        >
          Clear filters
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {form && (
        <form onSubmit={save} className="border rounded p-4 mb-6 grid grid-cols-2 gap-3">
          <h2 className="col-span-2 font-semibold">
            {form._id ? `Edit ${form.appointmentNo}` : "Book appointment"}
          </h2>

          <select className={input} required value={form.patient} onChange={set("patient")}>
            <option value="">Select patient</option>
            {patients.map((p) => (
              <option key={p._id} value={p._id}>
                {p.patientNo} · {p.firstName} {p.lastName}
              </option>
            ))}
          </select>

          <select className={input} required value={form.doctor} onChange={set("doctor")}>
            <option value="">Select doctor</option>
            {bookableDoctors.map((d) => (
              <option key={d._id} value={d._id}>
                Dr. {d.firstName} {d.lastName} · {d.specialty} ({(d.workingDays || []).join(", ")})
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="datetime-local"
              className={input}
              required
              step={1800}
              value={form.dateTime}
              onChange={set("dateTime")}
            />
            <button type="button" onClick={fillNextSlot} className="border rounded px-3 whitespace-nowrap">
              Next free
            </button>
            <button type="button" onClick={walkIn} className="bg-amber-600 text-white rounded px-3 whitespace-nowrap">
              Walk-in
            </button>
          </div>

          <select className={input} value={form.reason} onChange={set("reason")}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>

          {form._id && (
            <select className={input} value={form.status} onChange={set("status")}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}

          <textarea
            className={`${input} col-span-2`}
            placeholder="Notes"
            value={form.notes}
            onChange={set("notes")}
          />

          <div className="col-span-2 flex gap-2">
            <button className="bg-teal-700 text-white px-4 py-2 rounded">Save</button>
            <button type="button" onClick={() => setForm(null)} className="border px-4 py-2 rounded">
              Cancel
            </button>
          </div>
        </form>
      )}

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-800 text-gray-100 text-left">
            <th className="p-2">No.</th>
            <th className="p-2">Date &amp; time</th>
            <th className="p-2">Patient</th>
            <th className="p-2">Doctor</th>
            <th className="p-2">Reason</th>
            <th className="p-2">Status</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {appointments.filter(Boolean).map((a) => (
            <tr key={a._id} className="border-b">
              <td className="p-2 font-mono text-sm">{a.appointmentNo}</td>
              <td className="p-2">{fmt(a.dateTime)}</td>
              <td className="p-2">
                {a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "(deleted)"}
              </td>
              <td className="p-2">
                {a.doctor ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : "(deleted)"}
              </td>
              <td className="p-2">{a.reason}</td>
              <td className={`p-2 ${STATUS_COLOR[a.status]}`}>{a.status}</td>
              <td className="p-2 text-right space-x-2 whitespace-nowrap">
                {a.status === "Scheduled" && (
                  <>
                    <button onClick={() => setStatus(a, "Completed")} className="text-green-500">Done</button>
                    <button onClick={() => setStatus(a, "Cancelled")} className="text-amber-500">Cancel</button>
                  </>
                )}
                <button onClick={() => openEdit(a)} className="text-teal-500">Edit</button>
                <button onClick={() => remove(a)} className="text-red-600">Delete</button>
              </td>
            </tr>
          ))}
          {appointments.length === 0 && (
            <tr>
              <td colSpan={7} className="p-4 text-center text-gray-500">No appointments found</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}