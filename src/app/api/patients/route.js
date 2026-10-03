import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Patient from "@/models/Patient";

export async function GET() {
  await dbConnect();
  const patients = await Patient.find().sort({ createdAt: -1 });
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