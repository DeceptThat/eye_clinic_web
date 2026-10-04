import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Patient from "@/models/Patient";
import Doctor from "@/models/Doctor";
import { checkBooking } from "@/lib/appointmentRules";
import { requireRole } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { BAD_BODY, fail, isId, pick, readBody } from "@/lib/http";

const POPULATE = [
  { path: "patient", select: "patientNo firstName lastName phone" },
  { path: "doctor", select: "doctorNo firstName lastName specialty" },
];

// Fields that can be edited (appointmentNo and checkout are handled by the server)
const FIELDS = ["patient", "doctor", "dateTime", "reason", "status", "notes"];

export async function GET(req, { params }) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!isId(id)) return fail("Invalid id");
  await dbConnect();
  const appt = await Appointment.findById(id).populate(POPULATE);
  if (!appt) return fail("Not found", 404);
  return NextResponse.json(appt);
}

export async function PUT(req, { params }) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!isId(id)) return fail("Invalid id");
  const raw = await readBody(req);
  if (!raw) return fail(BAD_BODY);
  const body = pick(raw, FIELDS);
  if (raw.checkedOutAt) body.checkedOutAt = new Date(); // closing a visit at checkout: server sets the time
  await dbConnect();

  const existing = await Appointment.findById(id);
  if (!existing) return fail("Not found", 404);

  const next = {
    patient: body.patient ?? String(existing.patient),
    doctor: body.doctor ?? String(existing.doctor),
    dateTime: body.dateTime ?? existing.dateTime,
    status: body.status ?? existing.status,
  };

  const patientChanged = String(next.patient) !== String(existing.patient);
  const doctorChanged = String(next.doctor) !== String(existing.doctor);
  const when = new Date(next.dateTime);
  if (isNaN(when.getTime())) return fail("Please choose a valid date and time");
  const timeChanged = when.getTime() !== existing.dateTime.getTime();
  const reopened = existing.status !== "Scheduled" && next.status === "Scheduled";

  // A new patient or doctor must exist, whatever the status
  if (patientChanged && !(isId(next.patient) && (await Patient.exists({ _id: next.patient })))) {
    return fail("Patient not found");
  }
  if (doctorChanged && !(isId(next.doctor) && (await Doctor.exists({ _id: next.doctor })))) {
    return fail("Doctor not found");
  }

  // Re-check the booking rules when the booking itself changes
  if (next.status === "Scheduled" && (timeChanged || doctorChanged || patientChanged || reopened)) {
    const problem = await checkBooking({
      patientId: next.patient,
      doctorId: next.doctor,
      dateTime: next.dateTime,
      excludeId: id,
      checkPast: timeChanged || reopened,
    });
    if (problem) return fail(problem, 409);
  }

  try {
    const updated = await Appointment.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).populate(POPULATE);
    return NextResponse.json(updated);
  } catch (err) {
    return fail(friendlyError(err));
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!isId(id)) return fail("Invalid id");
  await dbConnect();
  const appt = await Appointment.findByIdAndDelete(id);
  if (!appt) return fail("Not found", 404);
  return NextResponse.json({ ok: true });
}
