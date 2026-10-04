"use client";
import { useEffect, useState } from "react";
import { Badge, Icon, Page, PageHeader } from "@/components/ui";

const COLLECTIONS = ["Patients", "Doctors", "Appointments", "Products", "Sales", "Users (no passwords)"];

export default function BackupPage() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch("/api/backup/status").then((r) => r.json()).then(setStatus);
  }, []);

  return (
    <Page>
      <PageHeader title="Backup" description="Keep a copy of the clinic's data safe." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon name="download" />
            </span>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900">Download a backup now</h2>
              <p className="mt-1 text-sm text-slate-500">One JSON file with everything below.</p>
              <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600">
                {COLLECTIONS.map((c) => (
                  <li key={c} className="flex items-center gap-2">
                    <Icon name="check" className="h-4 w-4 text-emerald-600" /> {c}
                  </li>
                ))}
              </ul>
              <a href="/api/backup" className="btn btn-primary mt-6">
                <Icon name="download" className="h-4 w-4" /> Download backup
              </a>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon name="database" />
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">Automatic daily backup</h2>
                {status && !status.error && (
                  <Badge tone={status.configured && status.last ? "green" : "gray"} dot>
                    {status.configured ? (status.last ? "Running" : "Waiting for first run") : "Not set up here"}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                The server saves a full database copy every night at 02:00 and keeps the last 7 days.
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 text-sm">
                <div>
                  <dt className="text-slate-500">Last backup</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">
                    {!status ? "Checking…" : status.error ? "-" : status.configured ? status.last ?? "None yet" : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Copies kept</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">{status?.configured ? status.count : "-"}</dd>
                </div>
              </dl>
              {status?.error && <p className="mt-3 text-sm text-red-600">{status.error}</p>}
              {status && !status.error && !status.configured && (
                <p className="mt-3 text-xs text-slate-500">This runs on the deployed server, not on a development laptop.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </Page>
  );
}
