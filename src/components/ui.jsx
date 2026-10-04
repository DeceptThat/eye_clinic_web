"use client";
import Link from "next/link";
import { useEffect } from "react";

/* ------------------------------------------------------------------
   Icons (stroke icons, 24x24 grid)
   ------------------------------------------------------------------ */
const ICONS = {
  dashboard: [
    ["rect", { x: 3, y: 3, width: 7, height: 9, rx: 1 }],
    ["rect", { x: 14, y: 3, width: 7, height: 5, rx: 1 }],
    ["rect", { x: 14, y: 12, width: 7, height: 9, rx: 1 }],
    ["rect", { x: 3, y: 16, width: 7, height: 5, rx: 1 }],
  ],
  calendar: [
    ["rect", { x: 3, y: 4, width: 18, height: 18, rx: 2 }],
    ["path", { d: "M16 2v4M8 2v4M3 10h18" }],
  ],
  users: [
    ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
    ["circle", { cx: 9, cy: 7, r: 4 }],
    ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" }],
  ],
  user: [
    ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }],
    ["circle", { cx: 12, cy: 7, r: 4 }],
  ],
  stethoscope: [
    ["path", { d: "M5 3H4a1 1 0 0 0-1 1v5a5 5 0 0 0 10 0V4a1 1 0 0 0-1-1h-1" }],
    ["path", { d: "M8 14v1a6 6 0 0 0 12 0v-3" }],
    ["circle", { cx: 20, cy: 10, r: 2 }],
  ],
  box: [
    ["path", { d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" }],
    ["path", { d: "M3.3 7 12 12l8.7-5M12 22V12" }],
  ],
  receipt: [
    ["path", { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" }],
    ["path", { d: "M8 8h8M8 12h8M8 16h5" }],
  ],
  cart: [
    ["circle", { cx: 8, cy: 21, r: 1 }],
    ["circle", { cx: 19, cy: 21, r: 1 }],
    ["path", { d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" }],
  ],
  shield: [["path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }]],
  database: [
    ["ellipse", { cx: 12, cy: 5, rx: 9, ry: 3 }],
    ["path", { d: "M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0" }],
  ],
  logout: [["path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" }]],
  plus: [["path", { d: "M12 5v14M5 12h14" }]],
  minus: [["path", { d: "M5 12h14" }]],
  search: [
    ["circle", { cx: 11, cy: 11, r: 8 }],
    ["path", { d: "m21 21-4.3-4.3" }],
  ],
  x: [["path", { d: "M18 6 6 18M6 6l12 12" }]],
  edit: [["path", { d: "M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" }]],
  trash: [["path", { d: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }]],
  eye: [
    ["path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }],
    ["circle", { cx: 12, cy: 12, r: 3 }],
  ],
  clock: [
    ["circle", { cx: 12, cy: 12, r: 10 }],
    ["path", { d: "M12 6v6l4 2" }],
  ],
  alert: [["path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3ZM12 9v4M12 17h.01" }]],
  check: [["path", { d: "M20 6 9 17l-5-5" }]],
  printer: [
    ["path", { d: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }],
    ["rect", { x: 6, y: 14, width: 12, height: 8 }],
  ],
  menu: [["path", { d: "M4 6h16M4 12h16M4 18h16" }]],
  download: [["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" }]],
  arrowRight: [["path", { d: "M5 12h14M12 5l7 7-7 7" }]],
  walk: [
    ["circle", { cx: 13, cy: 4, r: 2 }],
    ["path", { d: "M7 21l3-4M16 21l-2-4-3-3 1-6M6 12l2-3 4-1 3 3 3 1" }],
  ],
  refresh: [["path", { d: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" }]],
  ban: [
    ["circle", { cx: 12, cy: 12, r: 10 }],
    ["path", { d: "m4.9 4.9 14.2 14.2" }],
  ],
  card: [
    ["rect", { x: 2, y: 5, width: 20, height: 14, rx: 2 }],
    ["path", { d: "M2 10h20M6 15h4" }],
  ],
  qr: [
    ["rect", { x: 3, y: 3, width: 7, height: 7, rx: 1 }],
    ["rect", { x: 14, y: 3, width: 7, height: 7, rx: 1 }],
    ["rect", { x: 3, y: 14, width: 7, height: 7, rx: 1 }],
    ["path", { d: "M14 14h3v3h-3zM21 14v.01M14 21h.01M17.5 17.5H21V21h-3.5z" }],
  ],
  wallet: [
    ["path", { d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" }],
    ["path", { d: "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" }],
  ],
};

export function Icon({ name, className = "h-5 w-5", strokeWidth = 1.8 }) {
  const parts = ICONS[name] || [];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {parts.map(([Tag, attrs], i) => (
        <Tag key={i} {...attrs} />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------
   Layout pieces
   ------------------------------------------------------------------ */
export function Page({ children, wide }) {
  return (
    <div className={`mx-auto w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 ${wide ? "max-w-[1400px]" : "max-w-7xl"}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Toolbar({ children }) {
  return <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">{children}</div>;
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative flex-1">
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input className="input pl-9" placeholder={placeholder} value={value} onChange={onChange} />
    </div>
  );
}

/* ------------------------------------------------------------------
   Feedback
   ------------------------------------------------------------------ */
export function Alert({ children, onClose, tone = "red" }) {
  if (!children) return null;
  const tones = {
    red: "border-red-200 bg-red-50 text-red-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    blue: "border-brand-200 bg-brand-50 text-brand-800",
  };
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${tones[tone]}`} role="alert">
      <Icon name={tone === "green" ? "check" : "alert"} className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
          <Icon name="x" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function Badge({ tone = "gray", children, dot }) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const STATUS_TONE = {
  Scheduled: "blue",
  Completed: "green",
  Cancelled: "gray",
  Voided: "gray",
  Active: "green",
  Inactive: "gray",
};

export function EmptyRow({ colSpan, icon = "search", title, hint }) {
  return (
    <tr>
      <td colSpan={colSpan} className="!py-12 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Icon name={icon} />
          </div>
          <p className="font-medium text-slate-700">{title}</p>
          {hint && <p className="text-sm text-slate-500">{hint}</p>}
        </div>
      </td>
    </tr>
  );
}

export function Avatar({ name = "", tone = "brand", size = "md" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const tones = {
    brand: "bg-brand-100 text-brand-700",
    slate: "bg-slate-200 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    violet: "bg-violet-100 text-violet-700",
  };
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-base" };
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${tones[tone]} ${sizes[size]}`}>
      {initials || "?"}
    </span>
  );
}

/* ------------------------------------------------------------------
   Modal
   ------------------------------------------------------------------ */
export function Modal({ title, subtitle, onClose, children, footer, size = "md" }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const widths = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-3xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} />
      <div className={`relative my-8 w-full ${widths[size]} rounded-2xl bg-white shadow-xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, span, children }) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------
   Stat card
   ------------------------------------------------------------------ */
export function StatCard({ label, value, hint, icon, tone = "brand", href }) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  const body = (
    <div className="card flex items-start gap-4 p-5 transition-shadow hover:shadow-md">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon name={icon} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */
export const baht = (n) =>
  `฿${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-";

export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

// Is this date "today" in Thailand time?
export function isTodayBangkok(iso) {
  const opts = { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" };
  return new Date(iso).toLocaleDateString("en-CA", opts) === new Date().toLocaleDateString("en-CA", opts);
}

export function ageFrom(dob) {
  if (!dob) return "";
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}
