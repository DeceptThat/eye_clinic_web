import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Appointment from "@/models/Appointment";
import "@/models/Patient";
import "@/models/Doctor";
import { checkBooking } from "@/lib/appointmentRules";
import { requireRole } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { saveWithNumber } from "@/lib/ids";
import { BAD_BODY, bangkokDay, fail, isId, pick, readBody } from "@/lib/http";

const POPULATE = [
  { path: "patient", select: "patientNo firstName lastName phone" },
  { path: "doctor", select: "doctorNo firstName lastName specialty" },
];


const FIELDS = ["patient", "doctor", "dateTime", "reason", "notes"];


export async function GET(req) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  const sp = req.nextUrl.searchParams;
  const filter = {};

  const date = sp.get("date");
  if (date) {
    const day = bangkokDay(date); 
    if (!day) return fail("Date is not valid");
    filter.dateTime = { $gte: day.start, $lt: day.end };
  }
  for (const key of ["doctor", "patient"]) {
    const v = sp.get(key);
    if (!v) continue;
    if (!isId(v)) return fail(`${key === "doctor" ? "Doctor" : "Patient"} id is not valid`);
    filter[key] = v;
  }
  if (sp.get("status")) filter.status = sp.get("status");

  await dbConnect();
  const list = await Appointment.find(filter).sort({ dateTime: 1 }).populate(POPULATE);
  return NextResponse.json(list);
}

export async function POST(req) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  const body = await readBody(req);
  if (!body) return fail(BAD_BODY);
  await dbConnect();

  const problem = await checkBooking({
    patientId: body.patient,
    doctorId: body.doctor,
    dateTime: body.dateTime,
  });
  if (problem) return fail(problem, 409);

  try {
    const appt = new Appointment({ ...pick(body, FIELDS), status: "Scheduled" });
    await saveWithNumber(appt, "appointmentNo");
    return NextResponse.json(await appt.populate(POPULATE), { status: 201 });
  } catch (err) {
    return fail(friendlyError(err));
  }
}
