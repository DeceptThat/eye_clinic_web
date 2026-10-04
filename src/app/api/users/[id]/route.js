import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { requireRole } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { BAD_BODY, fail, isId, readBody } from "@/lib/http";

const badId = (id) => !isId(id);

export async function PUT(req, { params }) {
  const auth = await requireRole(req, "Admin");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const body = await readBody(req);
  if (!body) return fail(BAD_BODY);
  await dbConnect();

  const { name, username, password, role, isActive } = body;
  if (id === auth.user.id && (role !== "Admin" || isActive === false)) {
    return NextResponse.json({ error: "You cannot remove your own admin access" }, { status: 400 });
  }
  const update = { name, username, role, isActive };
  if (password) {
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    update.passwordHash = await bcrypt.hash(password, 10);
  }
  try {
    const user = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .select("-passwordHash");
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) {
    return fail(friendlyError(err, { username: "Username already taken" }));
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireRole(req, "Admin");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  if (id === auth.user.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }
  await dbConnect();
  const user = await User.findByIdAndDelete(id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}