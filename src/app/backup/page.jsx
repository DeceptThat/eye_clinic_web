"use client";
import { useEffect, useState } from "react";

export default function BackupPage() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch("/api/backup/status").then((r) => r.json()).then(setStatus);
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Backup</h1>

      <section className="border border-gray-700 rounded p-4 space-y-2">
        <h2 className="font-semibold">Download a backup now</h2>
        <p className="text-sm text-gray-400">
          Exports patients, doctors, appointments, products, sales and users (without passwords) as one JSON file.
        </p>
        <a href="/api/backup" className="inline-block bg-teal-700 text-white px-4 py-2 rounded">
          Download backup
        </a>
      </section>

      <section className="border border-gray-700 rounded p-4 space-y-2">
        <h2 className="font-semibold">Automatic daily backup (server)</h2>
        {!status ? (
          <p className="text-gray-400">Checking…</p>
        ) : status.error ? (
          <p className="text-red-600">{status.error}</p>
        ) : !status.configured ? (
          <p className="text-gray-400">Not set up on this machine. It runs on the deployed server.</p>
        ) : (
          <p>
            Last backup: <b>{status.last ?? "none yet"}</b> · {status.count} kept
          </p>
        )}
      </section>
    </main>
  );
}
