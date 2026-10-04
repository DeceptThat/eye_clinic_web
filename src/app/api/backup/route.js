import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const COLLECTIONS = ["patients", "doctors", "appointments", "products", "sales", "users"];

export async function GET(req) {
  const auth = await requireRole(req, "Admin");
  if (auth.error) return auth.error;
  await dbConnect();

  const db = mongoose.connection.db;
  const out = { exportedAt: new Date().toISOString(), exportedBy: auth.user.name };
  for (const name of COLLECTIONS) {
    const options = name === "users" ? { projection: { passwordHash: 0 } } : {};
    out[name] = await db.collection(name).find({}, options).toArray();
  }

  const date = new Date(Date.now() + 7 * 60 * 60000).toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="eyeclinic-backup-${date}.json"`,
    },
  });
}
