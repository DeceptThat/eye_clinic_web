"use client";
import { useEffect, useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const REASONS = ["Leave", "Sick", "Emergency surgery", "Other"];
const EMPTY = {
  firstName: "", lastName: "", specialty: "", licenseNo: "",
  phone: "", email: "", workingDays: [], isActive: true, timeOff: [],
};

// ISO date from the database -> value for <input type="datetime-local">
function toLocalInput(iso) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// Is the doctor on time off right now?
function currentTimeOff(d) {
  const now = new Date();
  return (d.timeOff || []).find((t) => new Date(t.start) <= now && now < new Date(t.end));
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null); // null = form hidden
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/doctors?q=${encodeURIComponent(q)}`);
    setDoctors(await res.json());
  }

  useEffect(() => {
    load();
  }, [q]);

  function openNew() {
    setError("");
    setForm({ ...EMPTY });
  }

  function openEdit(d) {
    setError("");
    setForm({
      ...EMPTY,
      ...d,
      timeOff: (d.timeOff || []).map((t) => ({
        reason: t.reason,
        start: toLocalInput(t.start),
        end: toLocalInput(t.end),
      })),
    });
  }

  function toggleDay(day) {
    const days = form.workingDays.includes(day)
      ? form.workingDays.filter((d) => d !== day)
      : [...form.workingDays, day];
    setForm({ ...form, workingDays: DAYS.filter((d) => days.includes(d)) }); // keep Mon→Sun order
  }

  function addTimeOff() {
    setForm({ ...form, timeOff: [...form.timeOff, { start: "", end: "", reason: "Leave" }] });
  }

  function updateTimeOff(i, field, value) {
    setForm({
      ...form,
      timeOff: form.timeOff.map((t, j) => (j === i ? { ...t, [field]: value } : t)),
    });
  }

  function removeTimeOff(i) {
    setForm({ ...form, timeOff: form.timeOff.filter((_, j) => j !== i) });
  }

  async function save(e) {
    e.preventDefault();
    if (form.timeOff.some((t) => !t.start || !t.end || new Date(t.end) <= new Date(t.start))) {
      return setError("Each time off needs a start and an end that is after the start");
    }
    const isEdit = Boolean(form._id);
    const res = await fetch(isEdit ? `/api/doctors/${form._id}` : "/api/doctors", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        timeOff: form.timeOff.map((t) => ({
          reason: t.reason,
          start: new Date(t.start).toISOString(),
          end: new Date(t.end).toISOString(),
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setForm(null);
    setError("");
    load();
  }

  async function remove(d) {
    if (!confirm(`Delete Dr. ${d.firstName} ${d.lastName}?`)) return;
    const res = await fetch(`/api/doctors/${d._id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error);
    load();
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const input = "border rounded px-3 py-2 w-full";

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Doctors</h1>
        <button onClick={openNew} className="bg-teal-700 text-white px-4 py-2 rounded">
          + Add doctor
        </button>
      </div>

      <input
        placeholder="Search by name, licence no., specialty or doctor no."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className={`${input} mb-4`}
      />

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {form && (
        <form onSubmit={save} className="border rounded p-4 mb-6 grid grid-cols-2 gap-3">
          <h2 className="col-span-2 font-semibold">
            {form._id ? `Edit ${form.doctorNo}` : "New doctor"}
          </h2>

          <input className={input} placeholder="First name" required value={form.firstName} onChange={set("firstName")} />
          <input className={input} placeholder="Last name" required value={form.lastName} onChange={set("lastName")} />
          <select className={input} required value={form.specialty} onChange={set("specialty")}>
            <option value="">Specialty</option>
            <option>Optometrist</option>
            <option>Ophthalmologist</option>
          </select>
          <input className={input} placeholder="Licence no." required value={form.licenseNo} onChange={set("licenseNo")} />
          <input className={input} placeholder="Phone" value={form.phone || ""} onChange={set("phone")} />
          <input className={input} type="email" placeholder="Email" value={form.email || ""} onChange={set("email")} />

          <div className="col-span-2">
            <p className="mb-1 text-sm">Working days</p>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((day) => (
                <label key={day} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={form.workingDays.includes(day)}
                    onChange={() => toggleDay(day)}
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>

          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm">Time off (leave, sick, emergency surgery)</p>
              <button type="button" onClick={addTimeOff} className="text-teal-500 text-sm">
                + Add time off
              </button>
            </div>
            {form.timeOff.length === 0 && (
              <p className="text-sm text-gray-500">No time off</p>
            )}
            {form.timeOff.map((t, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="datetime-local"
                  className={input}
                  required
                  value={t.start}
                  onChange={(e) => updateTimeOff(i, "start", e.target.value)}
                />
                <input
                  type="datetime-local"
                  className={input}
                  required
                  value={t.end}
                  onChange={(e) => updateTimeOff(i, "end", e.target.value)}
                />
                <select
                  className={input}
                  value={t.reason}
                  onChange={(e) => updateTimeOff(i, "reason", e.target.value)}
                >
                  {REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <button type="button" onClick={() => removeTimeOff(i)} className="text-red-600 px-2">
                  ✕
                </button>
              </div>
            ))}
          </div>

          <label className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active (can be booked)
          </label>

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
            <th className="p-2">Doctor No.</th>
            <th className="p-2">Name</th>
            <th className="p-2">Specialty</th>
            <th className="p-2">Working days</th>
            <th className="p-2">Status</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {doctors.map((d) => {
            const off = currentTimeOff(d);
            return (
              <tr key={d._id} className="border-b">
                <td className="p-2 font-mono text-sm">{d.doctorNo}</td>
                <td className="p-2">Dr. {d.firstName} {d.lastName}</td>
                <td className="p-2">{d.specialty}</td>
                <td className="p-2">{d.workingDays?.join(", ") || "-"}</td>
                <td className="p-2">
                  {!d.isActive ? (
                    <span className="text-gray-500">Inactive</span>
                  ) : off ? (
                    <span className="text-amber-500">Off now ({off.reason})</span>
                  ) : (
                    <span className="text-green-500">Active</span>
                  )}
                </td>
                <td className="p-2 text-right space-x-2">
                  <button onClick={() => openEdit(d)} className="text-teal-500">Edit</button>
                  <button onClick={() => remove(d)} className="text-red-600">Delete</button>
                </td>
              </tr>
            );
          })}
          {doctors.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center text-gray-500">No doctors found</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}