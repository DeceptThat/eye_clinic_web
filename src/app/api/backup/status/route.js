import { NextResponse } from "next/server";
import fs from "node:fs";
import { requireRole } from "@/lib/auth";


export async function GET(req) {
  const auth = await requireRole(req, "Admin");
  if (auth.error) return auth.error;

  const dir = process.env.BACKUP_DIR;
  if (!dir || !fs.existsSync(dir)) return NextResponse.json({ configured: false });

  const days = fs.readdirSync(dir).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n)).sort();
  return NextResponse.json({ configured: true, last: days.at(-1) ?? null, count: days.length });
}
