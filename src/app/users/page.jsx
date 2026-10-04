"use client";
import { useEffect, useState } from "react";
import {
  Alert, Avatar, Badge, EmptyRow, Field, Icon, Modal, Page, PageHeader, fmtDate,
} from "@/components/ui";

const EMPTY = { name: "", username: "", password: "", role: "Staff", isActive: true };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  async function load() {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setUsers(data);
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e) {
    e.preventDefault();
    const isEdit = Boolean(form._id);
    const res = await fetch(isEdit ? `/api/users/${form._id}` : "/api/users", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setFormError(data.error);
    setForm(null);
    load();
  }

  async function remove(u) {
    if (!confirm(`Delete user ${u.username}?`)) return;
    const res = await fetch(`/api/users/${u._id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error);
    setError("");
    load();
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <Page>
      <PageHeader
        title="User accounts"
        description="Staff can run the front desk. Admins can also manage doctors, prices, users and backups."
        actions={
          <button onClick={() => { setFormError(""); setForm({ ...EMPTY }); }} className="btn btn-primary">
            <Icon name="plus" className="h-4 w-4" /> Add user
          </button>
        }
      />

      <Alert onClose={() => setError("")}>{error}</Alert>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} tone={u.role === "Admin" ? "brand" : "slate"} />
                    <div>
                      <div className="font-medium text-slate-900">{u.name}</div>
                      <div className="id-text">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td><Badge tone={u.role === "Admin" ? "blue" : "gray"}>{u.role}</Badge></td>
                <td>
                  <Badge tone={u.isActive ? "green" : "gray"} dot>{u.isActive ? "Active" : "Disabled"}</Badge>
                </td>
                <td className="text-slate-500">{fmtDate(u.createdAt)}</td>
                <td className="whitespace-nowrap text-right">
                  <button onClick={() => { setFormError(""); setForm({ ...u, password: "" }); }}
                    className="btn-icon" title="Edit" aria-label="Edit">
                    <Icon name="edit" className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(u)} className="btn-icon-danger" title="Delete" aria-label="Delete">
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {loaded && users.length === 0 && <EmptyRow colSpan={5} icon="shield" title="No users yet" />}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal
          title={form._id ? `Edit ${form.name}` : "New user"}
          subtitle={form._id ? `@${form.username}` : "They can log in straight away."}
          onClose={() => setForm(null)}
          footer={
            <>
              <button type="button" onClick={() => setForm(null)} className="btn btn-secondary">Cancel</button>
              <button form="user-form" className="btn btn-primary">Save user</button>
            </>
          }
        >
          <form id="user-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {formError && <div className="sm:col-span-2"><Alert>{formError}</Alert></div>}
            <Field label="Full name">
              <input className="input" required value={form.name} onChange={set("name")} />
            </Field>
            <Field label="Username">
              <input className="input" required value={form.username} onChange={set("username")} />
            </Field>
            <Field label={form._id ? "New password" : "Password"} hint={form._id ? "Leave blank to keep the current password" : "At least 6 characters"}>
              <input className="input" type="password" required={!form._id} value={form.password} onChange={set("password")} />
            </Field>
            <Field label="Role">
              <select className="input" value={form.role} onChange={set("role")}>
                <option>Staff</option>
                <option>Admin</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" className="checkbox" checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active (can log in)
            </label>
          </form>
        </Modal>
      )}
    </Page>
  );
}
