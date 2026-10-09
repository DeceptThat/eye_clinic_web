import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import Patient from "@/models/Patient";
import Doctor from "@/models/Doctor";
import { requireRole } from "@/lib/auth";

const DAY = 24 * 60 * 60000;
const BKK = 7 * 60 * 60000;

export async function GET(req) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  await dbConnect();

  
  const start = new Date(Math.floor((Date.now() + BKK) / DAY) * DAY - BKK);
  const end = new Date(start.getTime() + DAY);
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Bangkok" }).format(now);

  const [todayAppointments, salesAgg, lowStock, expired, patientCount, upcomingCount, doctors] = await Promise.all([
    Appointment.find({ dateTime: { $gte: start, $lt: end } })
      .sort({ dateTime: 1 })
      .populate([
        { path: "patient", select: "patientNo firstName lastName" },
        { path: "doctor", select: "firstName lastName" },
      ]),
    Sale.aggregate([
      { $match: { status: "Completed", saleDate: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]),
    Product.find({ isActive: true, $expr: { $lte: ["$stockQty", "$reorderLevel"] } })
      .select("sku name stockQty reorderLevel")
      .sort({ stockQty: 1 }),
    Product.find({ isActive: true, expiryDate: { $lt: now } }).select("sku name expiryDate"),
    Patient.countDocuments(),
    Appointment.countDocuments({ status: "Scheduled", dateTime: { $gte: now } }),
    Doctor.find({ isActive: true })
      .select("doctorNo firstName lastName specialty workingDays timeOff")
      .sort({ firstName: 1 }),
  ]);

  
  const onDuty = [];
  const offToday = [];
  for (const d of doctors) {
    const timeOff = (d.timeOff || []).filter((t) => t.start < end && start < t.end);
    const item = {
      _id: d._id, doctorNo: d.doctorNo, firstName: d.firstName, lastName: d.lastName,
      specialty: d.specialty, workingDays: d.workingDays, timeOff,
    };
    if (d.workingDays.includes(weekday)) onDuty.push(item);
    else offToday.push(item);
  }

  return NextResponse.json({
    todayAppointments,
    salesToday: { total: salesAgg[0]?.total ?? 0, count: salesAgg[0]?.count ?? 0 },
    lowStock,
    expired,
    patientCount,
    upcomingCount,
    weekday,
    dayStart: start,
    onDuty,
    offToday,
  });
}
