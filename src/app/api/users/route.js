import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { requireRole } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { BAD_BODY, fail, readBody } from "@/lib/http";

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
  const body = await readBody(req);
  if (!body) return fail(BAD_BODY);
  const { name, username, password, role, isActive } = body;
  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }
  try {
    await dbConnect();
    const user = await User.create({
      name, username, role, isActive,
      passwordHash: await bcrypt.hash(password, 10),
    });
    const { passwordHash, ...safe } = user.toObject();
    return NextResponse.json(safe, { status: 201 });
  } catch (err) {
    return fail(friendlyError(err, { username: "Username already taken" }));
  }
}