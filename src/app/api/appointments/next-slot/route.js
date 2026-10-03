import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Doctor from "@/models/Doctor";
import Appointment from "@/models/Appointment";
import { SLOT_MINUTES } from "@/lib/appointmentRules";

const OPEN_HOUR = 9;   // clinic opens 09:00 (Thailand time)
const CLOSE_HOUR = 18; // last appointment must end by 18:00
const STEP = 15 * 60000;
const SLOT = SLOT_MINUTES * 60000;
const BKK = 7 * 60 * 60000;
const DAY = 24 * 60 * 60000;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Start of "today" in Thailand time, as a UTC timestamp
function startOfBangkokDay(t) {
  return Math.floor((t + BKK) / DAY) * DAY - BKK;
}

// GET /api/appointments/next-slot?doctor=<id>            -> earliest free slot (next 2 weeks)
// GET /api/appointments/next-slot?doctor=<id>&walkin=1   -> today only, after the last walk-in
export async function GET(req) {
  await dbConnect();
  const sp = req.nextUrl.searchParams;
  const walkin = sp.get("walkin") === "1";
  const doctor = await Doctor.findById(sp.get("doctor"));
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  const name = `Dr. ${doctor.firstName} ${doctor.lastName}`;
  if (!doctor.isActive) return NextResponse.json({ error: `${name} is inactive` }, { status: 409 });

  const now = Date.now();
  let start = now;
  let horizon = now + 14 * DAY;

  if (walkin) {
    const today = DAY_NAMES[new Date(now + BKK).getUTCDay()];
    if (!doctor.workingDays.includes(today)) {
      return NextResponse.json({ error: `${name} isn't working today (${today})` }, { status: 409 });
    }
    horizon = startOfBangkokDay(now) + DAY; // end of today

    // Join the end of today's walk-in line
    const lastWalkIn = await Appointment.findOne({
      doctor: doctor._id,
      status: "Scheduled",
      notes: /^Walk-in/,
      dateTime: { $gte: new Date(startOfBangkokDay(now)), $lt: new Date(horizon) },
    }).sort({ dateTime: -1 });
    if (lastWalkIn) start = Math.max(start, lastWalkIn.dateTime.getTime() + SLOT);
  }

  const booked = await Appointment.find({
    doctor: doctor._id,
    status: "Scheduled",
    dateTime: { $gte: new Date(start - SLOT), $lt: new Date(horizon) },
  }).select("dateTime");

  for (let t = Math.ceil(start / STEP) * STEP; t < horizon; t += STEP) {
    const local = new Date(t + BKK);
    const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
    if (minutes < OPEN_HOUR * 60 || minutes + SLOT_MINUTES > CLOSE_HOUR * 60) continue;
    if (!doctor.workingDays.includes(DAY_NAMES[local.getUTCDay()])) continue;
    const end = t + SLOT;
    if ((doctor.timeOff || []).some((o) => o.start.getTime() < end && t < o.end.getTime())) continue;
    if (booked.some((b) => Math.abs(b.dateTime.getTime() - t) < SLOT)) continue;
    return NextResponse.json({ dateTime: new Date(t).toISOString() });
  }

  const msg = walkin ? `${name} has no free time left today` : "No free time in the next 2 weeks";
  return NextResponse.json({ error: msg }, { status: 404 });
}
