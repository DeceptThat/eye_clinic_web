"use client";
import { useEffect, useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const EMPTY = {
  firstName: "", lastName: "", specialty: "", licenseNo: "",
  phone: "", email: "", workingDays: [], isActive: true,
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
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
    setForm({ ...EMPTY, ...d });
  }

  function toggleDay(day) {
    const days = form.workingDays.includes(day)
      ? form.workingDays.filter((d) => d !== day)
      : [...form.workingDays, day];
    setForm({ ...form, workingDays: DAYS.filter((d) => days.includes(d)) }); // keep Mon→Sun order
  }

  async function save(e) {
    e.preventDefault();
    const isEdit = Boolean(form._id);
    const res = await fetch(isEdit ? `/api/doctors/${form._id}` : "/api/doctors", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
          <input className={input} placeholder="Phone" value={form.phone} onChange={set("phone")} />
          <input className={input} type="email" placeholder="Email" value={form.email} onChange={set("email")} />

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
          {doctors.map((d) => (
            <tr key={d._id} className="border-b">
              <td className="p-2 font-mono text-sm">{d.doctorNo}</td>
              <td className="p-2">Dr. {d.firstName} {d.lastName}</td>
              <td className="p-2">{d.specialty}</td>
              <td className="p-2">{d.workingDays.join(", ") || "-"}</td>
              <td className="p-2">
                <span className={d.isActive ? "text-green-500" : "text-gray-500"}>
                  {d.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="p-2 text-right space-x-2">
                <button onClick={() => openEdit(d)} className="text-teal-500">Edit</button>
                <button onClick={() => remove(d)} className="text-red-600">Delete</button>
              </td>
            </tr>
          ))}
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