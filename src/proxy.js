import { NextResponse } from "next/server";
import { verifyToken } from "./lib/auth";

export async function proxy(req) {
  const token = req.cookies.get("token")?.value;
  const user = token && (await verifyToken(token));
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  const adminOnly = ["/users", "/backup"];
  if (adminOnly.some((p) => req.nextUrl.pathname.startsWith(p)) && user.role !== "Admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};