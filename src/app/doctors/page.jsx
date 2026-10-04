"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/components/AppShell";
import {
  Alert, Avatar, Badge, EmptyRow, Field, Icon, Modal, Page, PageHeader, SearchInput, Toolbar,
} from "@/components/ui";

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

function upcomingTimeOff(d) {
  const now = new Date();
  return (d.timeOff || []).filter((t) => new Date(t.end) > now).length;
}

function DayChips({ days }) {
  return (
    <div className="flex gap-1">
      {DAYS.map((day) => {
        const on = days?.includes(day);
        return (
          <span
            key={day}
            className={`inline-flex h-6 w-8 items-center justify-center rounded text-[11px] font-medium ${
              on ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-400"
            }`}
          >
            {day.slice(0, 2)}
          </span>
        );
      })}
    </div>
  );
}

export default function DoctorsPage() {
  const user = useUser();
  const isAdmin = user?.role === "Admin";
  const [doctors, setDoctors] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [form, setForm] = useState(null); // null = form hidden
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  async function load() {
    const qs = new URLSearchParams({ q });
    if (specialty) qs.set("specialty", specialty);
    const res = await fetch(`/api/doctors?${qs}`);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setDoctors(data);
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, [q, specialty]);

  function openNew() {
    setFormError("");
    setForm({ ...EMPTY });
  }

  function openEdit(d) {
    setFormError("");
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
      return setFormError("Each time off needs a start and an end that is after the start");
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
    if (!res.ok) return setFormError(data.error);
    setForm(null);
    load();
  }

  async function remove(d) {
    if (!confirm(`Delete Dr. ${d.firstName} ${d.lastName}?`)) return;
    const res = await fetch(`/api/doctors/${d._id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error);
    setError("");
    load();
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <Page>
      <PageHeader
        title="Doctors"
        description={loaded ? `${doctors.filter((d) => d.isActive).length} active of ${doctors.length}` : "Loading…"}
        actions={
          isAdmin && (
            <button onClick={openNew} className="btn btn-primary">
              <Icon name="plus" className="h-4 w-4" /> Add doctor
            </button>
          )
        }
      />

      <Toolbar>
        <SearchInput
          placeholder="Search by name, licence no., specialty or doctor no."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
          {["", "Optometrist", "Ophthalmologist"].map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => setSpecialty(s)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                specialty === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
              }`}
            >
              {s || "All specialties"}
            </button>
          ))}
        </div>
        {user && !isAdmin && <p className="text-sm text-slate-500 sm:px-2">View only: Admin manages doctors.</p>}
      </Toolbar>

      <Alert onClose={() => setError("")}>{error}</Alert>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Specialty</th>
              <th>Licence</th>
              <th>Working days</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((d) => {
              const off = currentTimeOff(d);
              const upcoming = upcomingTimeOff(d);
              return (
                <tr key={d._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={`${d.firstName} ${d.lastName}`} tone="violet" />
                      <div>
                        <div className="font-medium text-slate-900">Dr. {d.firstName} {d.lastName}</div>
                        <div className="id-text">{d.doctorNo}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge tone={d.specialty === "Ophthalmologist" ? "violet" : "blue"}>{d.specialty}</Badge>
                  </td>
                  <td className="id-text">{d.licenseNo}</td>
                  <td><DayChips days={d.workingDays} /></td>
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      {!d.isActive ? (
                        <Badge tone="gray" dot>Inactive</Badge>
                      ) : off ? (
                        <Badge tone="amber" dot>Off now · {off.reason}</Badge>
                      ) : (
                        <Badge tone="green" dot>Available</Badge>
                      )}
                      {upcoming > 0 && !off && (
                        <span className="text-xs text-slate-500">{upcoming} time off planned</span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-right">
                    {isAdmin && (
                      <>
                        <button onClick={() => openEdit(d)} className="btn-icon" title="Edit" aria-label="Edit">
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(d)} className="btn-icon-danger" title="Delete" aria-label="Delete">
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {loaded && doctors.length === 0 && (
              <EmptyRow colSpan={6} icon="stethoscope" title="No doctors found" />
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal
          size="lg"
          title={form._id ? `Edit Dr. ${form.firstName} ${form.lastName}` : "New doctor"}
          subtitle={form._id ? form.doctorNo : "A doctor number is created automatically."}
          onClose={() => setForm(null)}
          footer={
            <>
              <button type="button" onClick={() => setForm(null)} className="btn btn-secondary">Cancel</button>
              <button form="doctor-form" className="btn btn-primary">Save doctor</button>
            </>
          }
        >
          <form id="doctor-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {formError && <div className="sm:col-span-2"><Alert>{formError}</Alert></div>}
            <Field label="First name">
              <input className="input" required value={form.firstName} onChange={set("firstName")} />
            </Field>
            <Field label="Last name">
              <input className="input" required value={form.lastName} onChange={set("lastName")} />
            </Field>
            <Field label="Specialty">
              <select className="input" required value={form.specialty} onChange={set("specialty")}>
                <option value="">Select…</option>
                <option>Optometrist</option>
                <option>Ophthalmologist</option>
              </select>
            </Field>
            <Field label="Licence no.">
              <input className="input" required pattern="[A-Za-z0-9\-]{3,20}" title="Letters, numbers and - (3–20 characters)" value={form.licenseNo} onChange={set("licenseNo")} />
            </Field>
            <Field label="Phone">
              <input className="input" pattern="\+?[0-9\s\(\)\-]{6,20}" title="Digits, spaces, +, - and brackets (6–20 characters)" value={form.phone || ""} onChange={set("phone")} />
            </Field>
            <Field label="Email">
              <input className="input" type="email" value={form.email || ""} onChange={set("email")} />
            </Field>

            <Field label="Working days" span>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const on = form.workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleDay(day)}
                      className={`h-9 w-14 rounded-lg border text-sm font-medium transition-colors ${
                        on
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="sm:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="label mb-0">Time off</p>
                  <p className="text-xs text-slate-500">Leave, sick days or emergency surgery. The doctor can&apos;t be booked during these times.</p>
                </div>
                <button type="button" onClick={addTimeOff} className="btn btn-secondary btn-sm">
                  <Icon name="plus" className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              {form.timeOff.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-sm text-slate-500">
                  No time off planned
                </p>
              ) : (
                <div className="space-y-2">
                  {form.timeOff.map((t, i) => (
                    <div key={i} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_160px_auto]">
                      <input type="datetime-local" className="input" required value={t.start}
                        onChange={(e) => updateTimeOff(i, "start", e.target.value)} aria-label="From" />
                      <input type="datetime-local" className="input" required value={t.end}
                        onChange={(e) => updateTimeOff(i, "end", e.target.value)} aria-label="To" />
                      <select className="input" value={t.reason}
                        onChange={(e) => updateTimeOff(i, "reason", e.target.value)} aria-label="Reason">
                        {REASONS.map((r) => <option key={r}>{r}</option>)}
                      </select>
                      <button type="button" onClick={() => removeTimeOff(i)} className="btn-icon-danger self-center" aria-label="Remove">
                        <Icon name="x" className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" className="checkbox" checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active (can be booked)
            </label>
          </form>
        </Modal>
      )}
    </Page>
  );
}
