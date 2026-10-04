import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { createToken } from "@/lib/auth";
import { BAD_BODY, fail, readBody } from "@/lib/http";

export async function POST(req) {
  const body = await readBody(req);
  if (!body) return fail(BAD_BODY);
  const { username, password } = body;
  if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
    return fail("Enter your username and password");
  }
  await dbConnect();
  const user = await User.findOne({ username: username.toLowerCase().trim(), isActive: true });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return fail("Wrong username or password", 401);
  }
  const res = NextResponse.json({ name: user.name, role: user.role });
  res.cookies.set("token", await createToken(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // No maxAge: a session cookie, so closing the browser logs you out.
    // The token itself still expires after 8 hours (see lib/auth.js).
  });
  return res;
}
