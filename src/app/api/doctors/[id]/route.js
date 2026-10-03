import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Doctor from "@/models/Doctor";

const badId = (id) => !mongoose.Types.ObjectId.isValid(id);

export async function GET(req, { params }) {
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dbConnect();
  const doctor = await Doctor.findById(id);
  if (!doctor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doctor);
}

export async function PUT(req, { params }) {
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dbConnect();
  try {
    const doctor = await Doctor.findByIdAndUpdate(id, await req.json(), {
      new: true,
      runValidators: true,
    });
    if (!doctor) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(doctor);
  } catch (err) {
    const msg = err.code === 11000 ? "License number already exists" : err.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dbConnect();
  const doctor = await Doctor.findByIdAndDelete(id);
  if (!doctor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}