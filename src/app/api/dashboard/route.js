import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import Patient from "@/models/Patient";
import "@/models/Doctor";
import { requireRole } from "@/lib/auth";

const DAY = 24 * 60 * 60000;
const BKK = 7 * 60 * 60000;

export async function GET(req) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  await dbConnect();

  // "Today" in Thailand time
  const start = new Date(Math.floor((Date.now() + BKK) / DAY) * DAY - BKK);
  const end = new Date(start.getTime() + DAY);
  const now = new Date();

  const [todayAppointments, salesAgg, lowStock, expired, patientCount, upcomingCount] = await Promise.all([
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
  ]);

  return NextResponse.json({
    todayAppointments,
    salesToday: { total: salesAgg[0]?.total ?? 0, count: salesAgg[0]?.count ?? 0 },
    lowStock,
    expired,
    patientCount,
    upcomingCount,
  });
}
