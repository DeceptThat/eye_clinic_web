"use client";
import { useEffect, useState } from "react";

const EMPTY = { name: "", username: "", password: "", role: "Staff", isActive: true };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setUsers(data);
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
    if (!res.ok) return setError(data.error);
    setForm(null);
    setError("");
    load();
  }

  async function remove(u) {
    if (!confirm(`Delete user ${u.username}?`)) return;
    const res = await fetch(`/api/users/${u._id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error);
    load();
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const input = "border rounded px-3 py-2 w-full";

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">User accounts</h1>
        <button onClick={() => { setError(""); setForm({ ...EMPTY }); }}
          className="bg-teal-700 text-white px-4 py-2 rounded">+ Add user</button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {form && (
        <form onSubmit={save} className="border rounded p-4 mb-6 grid grid-cols-2 gap-3">
          <h2 className="col-span-2 font-semibold">{form._id ? `Edit ${form.username}` : "New user"}</h2>
          <input className={input} placeholder="Full name" required value={form.name} onChange={set("name")} />
          <input className={input} placeholder="Username" required value={form.username} onChange={set("username")} />
          <input className={input} type="password" required={!form._id}
            placeholder={form._id ? "New password (leave blank to keep)" : "Password (min 6)"}
            value={form.password} onChange={set("password")} />
          <select className={input} value={form.role} onChange={set("role")}>
            <option>Staff</option>
            <option>Admin</option>
          </select>
          <label className="col-span-2 flex items-center gap-2">
            <input type="checkbox" checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active (can log in)
          </label>
          <div className="col-span-2 flex gap-2">
            <button className="bg-teal-700 text-white px-4 py-2 rounded">Save</button>
            <button type="button" onClick={() => setForm(null)} className="border px-4 py-2 rounded">Cancel</button>
          </div>
        </form>
      )}

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-800 text-gray-100 text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Username</th>
            <th className="p-2">Role</th>
            <th className="p-2">Status</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id} className="border-b">
              <td className="p-2">{u.name}</td>
              <td className="p-2 font-mono text-sm">{u.username}</td>
              <td className="p-2">{u.role}</td>
              <td className={`p-2 ${u.isActive ? "text-green-500" : "text-gray-500"}`}>
                {u.isActive ? "Active" : "Disabled"}
              </td>
              <td className="p-2 text-right space-x-2">
                <button onClick={() => { setError(""); setForm({ ...u, password: "" }); }}
                  className="text-teal-500">Edit</button>
                <button onClick={() => remove(u)} className="text-red-600">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}