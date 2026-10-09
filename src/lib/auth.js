import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);


export const IDLE_MINUTES = 30;
const MAX_SESSION_MS = 8 * 60 * 60 * 1000;

export async function createToken(user, loginAt = Date.now()) {
  return new SignJWT({ id: String(user._id ?? user.id), name: user.name, role: user.role, loginAt })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${IDLE_MINUTES}m`)
    .sign(secret());
}


export function setTokenCookie(res, token) {
  res.cookies.set("token", token, { httpOnly: true, sameSite: "lax", path: "/" });
}


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





export async function requireRole(req, ...roles) {
  const user = await getUser(req);
  if (!user) return { error: NextResponse.json({ error: "Please log in" }, { status: 401 }) };
  if (roles.length && !roles.includes(user.role)) {
    return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  return { user };
}