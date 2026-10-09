"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { Avatar, Icon } from "@/components/ui";

const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

const NAV = [
  {
    group: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: "dashboard" }],
  },
  {
    group: "Clinic",
    items: [
      { href: "/appointments", label: "Appointments", icon: "calendar" },
      { href: "/patients", label: "Patients", icon: "users" },
      { href: "/doctors", label: "Doctors", icon: "stethoscope" },
    ],
  },
  {
    group: "Front desk",
    items: [
      { href: "/checkout", label: "Checkout", icon: "cart" },
      { href: "/sales", label: "Sales", icon: "receipt" },
      { href: "/products", label: "Products & Prices", icon: "box" },
    ],
  },
  {
    group: "Administration",
    adminOnly: true,
    items: [
      { href: "/users", label: "User accounts", icon: "shield" },
      { href: "/backup", label: "Backup", icon: "database" },
    ],
  },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 px-2">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
        <Icon name="eye" className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-slate-900">Eye Clinic</span>
        <span className="block text-xs text-slate-500">Clinic portal</span>
      </span>
    </Link>
  );
}

function SidebarContent({ user, pathname, onNavigate, onLogout }) {
  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-4 pt-5">
        <Brand />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {NAV.filter((g) => !g.adminOnly || user?.role === "Admin").map((g) => (
          <div key={g.group}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.group}</p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon name={item.icon} className={`h-[18px] w-[18px] ${active ? "text-brand-600" : "text-slate-400"}`} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={user?.name || ""} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{user?.name ?? "…"}</p>
            <p className="text-xs text-slate-500">{user?.role ?? ""}</p>
          </div>
          <button type="button" onClick={onLogout} className="btn-icon" title="Log out" aria-label="Log out">
            <Icon name="logout" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  
  useEffect(() => {
    if (pathname === "/login") return;
    fetch("/api/auth/me").then(async (r) => {
      if (r.ok) return setUser(await r.json());
      router.replace("/login");
    });
  }, [pathname, router]);

  
  
  useEffect(() => {
    if (pathname === "/login") return;
    let active = false;
    const markActive = () => { active = true; };
    const check = () =>
      fetch("/api/auth/me").then((r) => {
        if (!r.ok) router.replace("/login");
      });
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    const timer = setInterval(() => {
      if (active) { active = false; check(); }
    }, 5 * 60 * 1000);
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, markActive));
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname, router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  
  if (pathname === "/login") return children;

  return (
    <UserContext.Provider value={user}>
      <div className="min-h-screen">
        {}
        <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
          <SidebarContent user={user} pathname={pathname} onLogout={logout} />
        </aside>

        {}
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <Brand />
          <button type="button" className="btn-icon" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
        </header>
        {menuOpen && (
          <div className="no-print fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMenuOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
              <SidebarContent
                user={user}
                pathname={pathname}
                onNavigate={() => setMenuOpen(false)}
                onLogout={logout}
              />
            </aside>
          </div>
        )}

        <main className="lg:pl-64">{children}</main>
      </div>
    </UserContext.Provider>
  );
}
