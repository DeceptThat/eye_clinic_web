import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Sale from "@/models/Sale";
import User from "@/models/User";
import { requireRole } from "@/lib/auth";


export async function GET(req) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  await dbConnect();
  const ids = await Sale.distinct("soldBy");
  const users = await User.find({ _id: { $in: ids } }).select("name username").sort({ name: 1 });
  return NextResponse.json(users);
}
