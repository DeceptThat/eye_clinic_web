import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Doctor, { timeOffProblem } from "@/models/Doctor";
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
  const doctor = await Doctor.findById(id);
  if (!doctor) return fail("Not found", 404);
  return NextResponse.json(doctor);
}

export async function PUT(req, { params }) {
  const auth = await requireRole(req, "Admin");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!isId(id)) return fail("Invalid id");
  const body = await readBody(req);
  if (!body) return fail(BAD_BODY);
  const problem = timeOffProblem(body.timeOff);
  if (problem) return fail(problem);
  await dbConnect();
  try {
    const doctor = await Doctor.findByIdAndUpdate(id, omit(body, [...SYSTEM_FIELDS, "doctorNo"]), {
      returnDocument: "after",
      runValidators: true,
    });
    if (!doctor) return fail("Not found", 404);
    return NextResponse.json(doctor);
  } catch (err) {
    return fail(friendlyError(err, { licenseNo: "Licence number already exists" }));
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireRole(req, "Admin");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!isId(id)) return fail("Invalid id");
  await dbConnect();
  const upcoming = await Appointment.exists({ doctor: id, status: "Scheduled", dateTime: { $gte: new Date() } });
  if (upcoming) return fail("This doctor has upcoming appointments. Cancel or move them first.", 409);
  const doctor = await Doctor.findByIdAndDelete(id);
  if (!doctor) return fail("Not found", 404);
  return NextResponse.json({ ok: true });
}
