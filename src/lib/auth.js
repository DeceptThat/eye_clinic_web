import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);

// Logged out after 30 minutes without activity, and always 8 hours after logging in
export const IDLE_MINUTES = 30;
const MAX_SESSION_MS = 8 * 60 * 60 * 1000;

export async function createToken(user, loginAt = Date.now()) {
  return new SignJWT({ id: String(user._id ?? user.id), name: user.name, role: user.role, loginAt })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${IDLE_MINUTES}m`)
    .sign(secret());
}

// Session cookie: no maxAge, so it is dropped when the browser closes
export function setTokenCookie(res, token) {
  res.cookies.set("token", token, { httpOnly: true, sameSite: "lax", path: "/" });
}

// Gives an active user a fresh 30 minutes (until the 8-hour limit)
export async function refreshToken(res, user) {
  if (!user.loginAt || Date.now() - user.loginAt > MAX_SESSION_MS) return false;
  setTokenCookie(res, await createToken(user, user.loginAt));
  return true;
}

export async function verifyToken(token) {
  try {
    return (await jwtVerify(token, secret())).payload;
  } catch {
    return null;
  }
}

export async function getUser(req) {
  const token = req.cookies.get("token")?.value;
  return token ? verifyToken(token) : null;
}

// In an API route:
//   const auth = await requireRole(req);          // any logged-in user
//   const auth = await requireRole(req, "Admin"); // admin only
//   if (auth.error) return auth.error;
export async function requireRole(req, ...roles) {
  const user = await getUser(req);
  if (!user) return { error: NextResponse.json({ error: "Please log in" }, { status: 401 }) };
  if (roles.length && !roles.includes(user.role)) {
    return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  return { user };
}