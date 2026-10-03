import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Appointment from "@/models/Appointment";
import "@/models/Patient";
import "@/models/Doctor";
import { checkBooking } from "@/lib/appointmentRules";

const POPULATE = [
  { path: "patient", select: "patientNo firstName lastName phone" },
  { path: "doctor", select: "doctorNo firstName lastName specialty" },
];

// GET /api/appointments?date=2026-10-05&doctor=<id>&status=Scheduled
export async function GET(req) {
  await dbConnect();
  const sp = req.nextUrl.searchParams;
  const filter = {};

  const date = sp.get("date");
  if (date) {
    const start = new Date(`${date}T00:00:00+07:00`); // whole day in Thailand time
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    filter.dateTime = { $gte: start, $lt: end };
  }
  if (sp.get("doctor")) filter.doctor = sp.get("doctor");
  if (sp.get("status")) filter.status = sp.get("status");

  const list = await Appointment.find(filter).sort({ dateTime: 1 }).populate(POPULATE);
  return NextResponse.json(list);
}

export async function POST(req) {
  await dbConnect();
  const body = await req.json();

  const problem = await checkBooking({
    patientId: body.patient,
    doctorId: body.doctor,
    dateTime: body.dateTime,
  });
  if (problem) return NextResponse.json({ error: problem }, { status: 409 });

  try {
    const created = await Appointment.create({ ...body, status: "Scheduled" });
    return NextResponse.json(await created.populate(POPULATE), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}