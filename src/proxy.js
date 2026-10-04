import { NextResponse } from "next/server";
import { verifyToken } from "./lib/auth";

export async function proxy(req) {
  const token = req.cookies.get("token")?.value;
  const user = token && (await verifyToken(token));
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  if (req.nextUrl.pathname.startsWith("/users") && user.role !== "Admin") {
    return NextResponse.redirect(new URL("/appointments", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};