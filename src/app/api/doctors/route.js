import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Doctor from "@/models/Doctor";

function friendlyError(err) {
  if (err.code === 11000) return "License number already exists";
  return err.message;
}

export async function GET(req) {
  await dbConnect();
  const q = req.nextUrl.searchParams.get("q")?.trim();
  let filter = {};
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter = {
      $or: ["doctorNo", "firstName", "lastName", "licenseNo", "specialty"].map((f) => ({
        [f]: { $regex: safe, $options: "i" },
      })),
    };
  }
  const doctors = await Doctor.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(doctors);
}

export async function POST(req) {
  await dbConnect();
  try {
    const doctor = await Doctor.create(await req.json());
    return NextResponse.json(doctor, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 400 });
  }
}