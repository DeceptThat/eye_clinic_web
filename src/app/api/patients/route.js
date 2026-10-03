import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Patient from "@/models/Patient";

export async function GET(req) {
  await dbConnect();
  const q = req.nextUrl.searchParams.get("q")?.trim();
  let filter = {};
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter = {
      $or: ["patientNo", "firstName", "lastName", "phone"].map((f) => ({
        [f]: { $regex: safe, $options: "i" },
      })),
    };
  }
  const patients = await Patient.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(patients);
}

export async function POST(req) {
  await dbConnect();
  try {
    const patient = await Patient.create(await req.json());
    return NextResponse.json(patient, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}