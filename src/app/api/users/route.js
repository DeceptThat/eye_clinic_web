import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { requireRole } from "@/lib/auth";

export async function GET(req) {
  const auth = await requireRole(req, "Admin");
  if (auth.error) return auth.error;
  await dbConnect();
  const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
  return NextResponse.json(users);
}

export async function POST(req) {
  const auth = await requireRole(req, "Admin");
  if (auth.error) return auth.error;
  await dbConnect();
  const { name, username, password, role, isActive } = await req.json();
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }
  try {
    const user = await User.create({
      name, username, role, isActive,
      passwordHash: await bcrypt.hash(password, 10),
    });
    const { passwordHash, ...safe } = user.toObject();
    return NextResponse.json(safe, { status: 201 });
  } catch (err) {
    const msg = err.code === 11000 ? "Username already taken" : err.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}