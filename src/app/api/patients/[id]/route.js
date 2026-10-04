import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Patient from "@/models/Patient";
import Appointment from "@/models/Appointment";
import { friendlyError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { BAD_BODY, SYSTEM_FIELDS, fail, isId, omit, readBody } from "@/lib/http";

export async function GET(req, { params }) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!isId(id)) return fail("Invalid id");
  await dbConnect();
  const patient = await Patient.findById(id);
  if (!patient) return fail("Not found", 404);
  return NextResponse.json(patient);
}

export async function PUT(req, { params }) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!isId(id)) return fail("Invalid id");
  const body = await readBody(req);
  if (!body) return fail(BAD_BODY);
  await dbConnect();
  try {
    // The patient number never changes
    const patient = await Patient.findByIdAndUpdate(id, omit(body, [...SYSTEM_FIELDS, "patientNo"]), {
      returnDocument: "after",
      runValidators: true,
    });
    if (!patient) return fail("Not found", 404);
    return NextResponse.json(patient);
  } catch (err) {
    return fail(friendlyError(err));
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireRole(req, "Admin");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!isId(id)) return fail("Invalid id");
  await dbConnect();
  const upcoming = await Appointment.exists({ patient: id, status: "Scheduled", dateTime: { $gte: new Date() } });
  if (upcoming) return fail("This patient has upcoming appointments. Cancel them first.", 409);
  const patient = await Patient.findByIdAndDelete(id);
  if (!patient) return fail("Not found", 404);
  return NextResponse.json({ ok: true });
}
