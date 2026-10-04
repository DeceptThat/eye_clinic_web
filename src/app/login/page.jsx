"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Icon } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-linear-to-br from-brand-700 via-brand-600 to-sky-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30">
            <Icon name="eye" className="h-6 w-6" strokeWidth={2} />
          </span>
          <span className="text-lg font-semibold">Eye Clinic</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight">Everything your clinic runs on, in one place.</h1>
          <p className="mt-4 text-brand-100">
            Book appointments, manage patients and doctors, and check out glasses, medicine and accessories at the front desk.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-brand-50">
            {[
              ["calendar", "Appointments with walk-in queue and no double-booking"],
              ["cart", "Checkout with live stock and printable receipts"],
              ["shield", "Separate Staff and Admin access"],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <Icon name={icon} className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-brand-200">© {new Date().getFullYear()} Eye Clinic Management System</p>

        {/* decorative rings */}
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full border-[40px] border-white/10" />
        <div className="pointer-events-none absolute -top-24 right-24 h-48 w-48 rounded-full border-[24px] border-white/5" />
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Icon name="eye" strokeWidth={2} />
            </span>
            <span className="text-lg font-semibold">Eye Clinic</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Use your staff or admin account.</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <Alert onClose={() => setError("")}>{error}</Alert>
            <div>
              <label className="label" htmlFor="username">Username</label>
              <input id="username" className="input" autoComplete="username" required autoFocus
                value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" className="input" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary w-full py-2.5" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
