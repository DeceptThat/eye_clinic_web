"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    router.push("/appointments");
    router.refresh();
  }

  const input = "border rounded px-3 py-2 w-full";
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="border rounded p-6 w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-bold">Eye Clinic Login</h1>
        {error && <p className="text-red-600">{error}</p>}
        <input className={input} placeholder="Username" required value={username}
          onChange={(e) => setUsername(e.target.value)} />
        <input className={input} type="password" placeholder="Password" required value={password}
          onChange={(e) => setPassword(e.target.value)} />
        <button className="bg-teal-700 text-white px-4 py-2 rounded w-full">Log in</button>
      </form>
    </main>
  );
}