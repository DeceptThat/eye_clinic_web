import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Appointment from "@/models/Appointment";
import "@/models/Patient";
import "@/models/Doctor";
import { checkBooking } from "@/lib/appointmentRules";

const POPULATE = [
  { path: "patient", select: "patientNo firstName lastName phone" },
  { path: "doctor", select: "doctorNo firstName lastName specialty" },
];
const badId = (id) => !mongoose.Types.ObjectId.isValid(id);

export async function GET(req, { params }) {
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dbConnect();
  const appt = await Appointment.findById(id).populate(POPULATE);
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(appt);
}

export async function PUT(req, { params }) {
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dbConnect();

  const existing = await Appointment.findById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const next = {
    patient: body.patient ?? String(existing.patient),
    doctor: body.doctor ?? String(existing.doctor),
    dateTime: body.dateTime ?? existing.dateTime,
    status: body.status ?? existing.status,
  };

  const timeChanged = new Date(next.dateTime).getTime() !== existing.dateTime.getTime();
  const doctorChanged = next.doctor !== String(existing.doctor);
  const reopened = existing.status !== "Scheduled" && next.status === "Scheduled";

  // Only re-check the rules when the booking itself changes
  if (next.status === "Scheduled" && (timeChanged || doctorChanged || reopened)) {
    const problem = await checkBooking({
      patientId: next.patient,
      doctorId: next.doctor,
      dateTime: next.dateTime,
      excludeId: id,
      checkPast: timeChanged || reopened,
    });
    if (problem) return NextResponse.json({ error: problem }, { status: 409 });
  }

  try {
    const updated = await Appointment.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).populate(POPULATE);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dbConnect();
  const appt = await Appointment.findByIdAndDelete(id);
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}