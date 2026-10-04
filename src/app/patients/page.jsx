"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/components/AppShell";
import {
  Alert, Avatar, EmptyRow, Field, Icon, Modal, Page, PageHeader, SearchInput, Toolbar, ageFrom, fmtDate,
} from "@/components/ui";

const EMPTY = {
  firstName: "", lastName: "", dateOfBirth: "", gender: "",
  phone: "", email: "", address: "", medicalNotes: "",
};

export default function PatientsPage() {
  return (
    <Suspense fallback={null}>
      <Patients />
    </Suspense>
  );
}

function Patients() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useUser();
  const isAdmin = user?.role === "Admin";
  const [patients, setPatients] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null); // null = form hidden
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  async function load() {
    const res = await fetch(`/api/patients?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setPatients(data);
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, [q]);

  // Opened from the dashboard: /patients?new=1
  useEffect(() => {
    if (params.get("new") !== "1") return;
    setFormError("");
    setForm({ ...EMPTY });
    router.replace("/patients", { scroll: false });
  }, [params, router]);

  function openNew() {
    setFormError("");
    setForm({ ...EMPTY });
  }

  function openEdit(p) {
    setFormError("");
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
    if (!res.ok) return setFormError(data.error);
    setForm(null);
    load();
  }

  async function remove(p) {
    if (!confirm(`Delete ${p.firstName} ${p.lastName}?`)) return;
    const res = await fetch(`/api/patients/${p._id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error);
    setError("");
    load();
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <Page>
      <PageHeader
        title="Patients"
        description={loaded ? `${patients.length} patient${patients.length === 1 ? "" : "s"}${q ? " found" : " registered"}` : "Loading…"}
        actions={
          <button onClick={openNew} className="btn btn-primary">
            <Icon name="plus" className="h-4 w-4" /> Add patient
          </button>
        }
      />

      <Toolbar>
        <SearchInput
          placeholder="Search by name, phone or patient no."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </Toolbar>

      <Alert onClose={() => setError("")}>{error}</Alert>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Date of birth</th>
              <th>Gender</th>
              <th>Phone</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p._id}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={`${p.firstName} ${p.lastName}`} />
                    <div>
                      <Link href={`/patients/${p._id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                        {p.firstName} {p.lastName}
                      </Link>
                      <div className="id-text">{p.patientNo}</div>
                    </div>
                  </div>
                </td>
                <td>
                  {fmtDate(p.dateOfBirth)}
                  {p.dateOfBirth && <span className="ml-1 text-xs text-slate-500">({ageFrom(p.dateOfBirth)} y)</span>}
                </td>
                <td>{p.gender || "-"}</td>
                <td className="whitespace-nowrap">{p.phone}</td>
                <td className="max-w-[220px] truncate text-slate-500" title={p.medicalNotes}>{p.medicalNotes || "-"}</td>
                <td className="whitespace-nowrap text-right">
                  <Link href={`/patients/${p._id}`} className="btn-icon" title="History" aria-label="History">
                    <Icon name="clock" className="h-4 w-4" />
                  </Link>
                  <button onClick={() => openEdit(p)} className="btn-icon" title="Edit" aria-label="Edit">
                    <Icon name="edit" className="h-4 w-4" />
                  </button>
                  {isAdmin && (
                    <button onClick={() => remove(p)} className="btn-icon-danger" title="Delete" aria-label="Delete">
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {loaded && patients.length === 0 && (
              <EmptyRow colSpan={6} icon="users" title="No patients found" hint={q ? "Try a different search." : "Add your first patient."} />
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal
          title={form._id ? "Edit patient" : "New patient"}
          subtitle={form._id ? form.patientNo : "A patient number is created automatically."}
          onClose={() => setForm(null)}
          footer={
            <>
              <button type="button" onClick={() => setForm(null)} className="btn btn-secondary">Cancel</button>
              <button form="patient-form" className="btn btn-primary">Save patient</button>
            </>
          }
        >
          <form id="patient-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {formError && <div className="sm:col-span-2"><Alert>{formError}</Alert></div>}
            <Field label="First name">
              <input className="input" required value={form.firstName} onChange={set("firstName")} />
            </Field>
            <Field label="Last name">
              <input className="input" required value={form.lastName} onChange={set("lastName")} />
            </Field>
            <Field label="Date of birth">
              <input className="input" type="date" required value={form.dateOfBirth} onChange={set("dateOfBirth")} />
            </Field>
            <Field label="Gender">
              <select className="input" required value={form.gender} onChange={set("gender")}>
                <option value="">Select…</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Phone">
              <input className="input" required pattern="\+?[0-9\s\(\)\-]{6,20}" title="Digits, spaces, +, - and brackets (6–20 characters)" value={form.phone} onChange={set("phone")} />
            </Field>
            <Field label="Email" hint="Optional">
              <input className="input" type="email" value={form.email || ""} onChange={set("email")} />
            </Field>
            <Field label="Address" span hint="Optional">
              <input className="input" value={form.address || ""} onChange={set("address")} />
            </Field>
            <Field label="Medical notes" span hint="e.g. wears contact lenses, allergies">
              <textarea className="input min-h-[90px]" value={form.medicalNotes || ""} onChange={set("medicalNotes")} />
            </Field>
          </form>
        </Modal>
      )}
    </Page>
  );
}
