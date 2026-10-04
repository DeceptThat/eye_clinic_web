import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Appointment from "@/models/Appointment";
import "@/models/Patient";
import "@/models/Doctor";
import { requireRole } from "@/lib/auth";

const DAY = 24 * 60 * 60000;
const BKK = 7 * 60 * 60000;

// GET /api/checkout -> today's visits that have not been checked out yet
export async function GET(req) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  await dbConnect();

  const start = new Date(Math.floor((Date.now() + BKK) / DAY) * DAY - BKK); // today, Thailand time
  const end = new Date(start.getTime() + DAY);

  const queue = await Appointment.find({
    dateTime: { $gte: start, $lt: end },
    status: { $in: ["Scheduled", "Completed"] },
    checkedOutAt: null,
  })
    .sort({ dateTime: 1 })
    .populate([
      { path: "patient", select: "patientNo firstName lastName phone medicalNotes" },
      { path: "doctor", select: "firstName lastName specialty" },
    ]);

  return NextResponse.json(queue);
}
