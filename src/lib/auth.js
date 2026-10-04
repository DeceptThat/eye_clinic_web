import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);

export async function createToken(user) {
  return new SignJWT({ id: String(user._id), name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(secret());
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