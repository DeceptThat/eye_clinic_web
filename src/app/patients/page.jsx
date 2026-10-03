"use client";
import { useEffect, useState } from "react";

const EMPTY = {
  firstName: "", lastName: "", dateOfBirth: "", gender: "",
  phone: "", email: "", address: "", medicalNotes: "",
};

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null); // null = form hidden
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/patients?q=${encodeURIComponent(q)}`);
    setPatients(await res.json());
  }

  useEffect(() => {
    load();
  }, [q]);

  function openNew() {
    setError("");
    setForm({ ...EMPTY });
  }

  function openEdit(p) {
    setError("");
    setForm({ ...EMPTY, ...p, dateOfBirth: p.dateOfBirth?.slice(0, 10) ?? "" });
  }

  async function save(e) {
    e.preventDefault();
    const isEdit = Boolean(form._id);
    const res = await fetch(isEdit ? `/api/patients/${form._id}` : "/api/patients", {
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

  async function remove(p) {
    if (!confirm(`Delete ${p.firstName} ${p.lastName}?`)) return;
    const res = await fetch(`/api/patients/${p._id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error);
    load();
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const input = "border rounded px-3 py-2 w-full";

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Patients</h1>
        <button onClick={openNew} className="bg-teal-700 text-white px-4 py-2 rounded">
          + Add patient
        </button>
      </div>

      <input
        placeholder="Search by name, phone or patient no."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className={`${input} mb-4`}
      />

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {form && (
        <form onSubmit={save} className="border rounded p-4 mb-6 grid grid-cols-2 gap-3">
          <h2 className="col-span-2 font-semibold">
            {form._id ? `Edit ${form.patientNo}` : "New patient"}
          </h2>
          <input className={input} placeholder="First name" required value={form.firstName} onChange={set("firstName")} />
          <input className={input} placeholder="Last name" required value={form.lastName} onChange={set("lastName")} />
          <input className={input} type="date" required value={form.dateOfBirth} onChange={set("dateOfBirth")} />
          <select className={input} required value={form.gender} onChange={set("gender")}>
            <option value="">Gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
          <input className={input} placeholder="Phone" required value={form.phone} onChange={set("phone")} />
          <input className={input} type="email" placeholder="Email" value={form.email} onChange={set("email")} />
          <input className={`${input} col-span-2`} placeholder="Address" value={form.address} onChange={set("address")} />
          <textarea className={`${input} col-span-2`} placeholder="Medical notes (e.g. contact lenses, allergies)" value={form.medicalNotes} onChange={set("medicalNotes")} />
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
            <th className="p-2">Patient No.</th>
            <th className="p-2">Name</th>
            <th className="p-2">Date of birth</th>
            <th className="p-2">Phone</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p._id} className="border-b">
              <td className="p-2 font-mono text-sm">{p.patientNo}</td>
              <td className="p-2">{p.firstName} {p.lastName}</td>
              <td className="p-2">{p.dateOfBirth?.slice(0, 10)}</td>
              <td className="p-2">{p.phone}</td>
              <td className="p-2 text-right space-x-2">
                <button onClick={() => openEdit(p)} className="text-teal-700">Edit</button>
                <button onClick={() => remove(p)} className="text-red-600">Delete</button>
              </td>
            </tr>
          ))}
          {patients.length === 0 && (
            <tr>
              <td colSpan={5} className="p-4 text-center text-gray-500">No patients found</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}