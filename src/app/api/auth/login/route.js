import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { createToken } from "@/lib/auth";

export async function POST(req) {
  const { username, password } = await req.json();
  await dbConnect();
  const user = await User.findOne({ username: username?.toLowerCase().trim(), isActive: true });
  if (!user || !(await bcrypt.compare(password ?? "", user.passwordHash))) {
    return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
  }
  const res = NextResponse.json({ name: user.name, role: user.role });
  res.cookies.set("token", await createToken(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}