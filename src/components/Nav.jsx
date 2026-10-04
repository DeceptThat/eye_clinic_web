"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setUser);
  }, [pathname]);

  if (pathname === "/login" || !user) return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = [
    ["/", "Dashboard"],
    ["/appointments", "Appointments"],
    ["/patients", "Patients"],
    ["/doctors", "Doctors"],
    ["/products", "Products"],
    ["/sales", "Sales"],
    ...(user.role === "Admin" ? [["/users", "Users"], ["/backup", "Backup"]] : []),
  ];
  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center gap-6">
      <span className="font-bold text-teal-400">Eye Clinic</span>
      {links.map(([href, label]) => (
        <Link key={href} href={href}
          className={isActive(href) ? "text-white font-semibold" : "text-gray-400"}>
          {label}
        </Link>
      ))}
      <span className="ml-auto text-sm text-gray-400">{user.name} ({user.role})</span>
      <button onClick={logout} className="text-sm border rounded px-3 py-1">Logout</button>
    </nav>
  );
}