import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Patient from "@/models/Patient";

function badId(id) {
  return !mongoose.Types.ObjectId.isValid(id);
}

export async function GET(req, { params }) {
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dbConnect();
  const patient = await Patient.findById(id);
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(patient);
}

export async function PUT(req, { params }) {
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dbConnect();
  try {
    const patient = await Patient.findByIdAndUpdate(id, await req.json(), {
      new: true,
      runValidators: true,
    });
    if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(patient);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dbConnect();
  const patient = await Patient.findByIdAndDelete(id);
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}



export async function GET(req) {
  await dbConnect();
  const q = req.nextUrl.searchParams.get("q")?.trim();
  let filter = {};
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // treat input as plain text
    filter = {
      $or: ["patientNo", "firstName", "lastName", "phone"].map((f) => ({
        [f]: { $regex: safe, $options: "i" },
      })),
    };
  }
  const patients = await Patient.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(patients);
}