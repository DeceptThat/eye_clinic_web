import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Doctor, { timeOffProblem } from "@/models/Doctor";
import { requireRole } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { saveWithNumber } from "@/lib/ids";
import { BAD_BODY, SYSTEM_FIELDS, fail, omit, readBody } from "@/lib/http";

const DUPLICATES = { licenseNo: "Licence number already exists" };

export async function GET(req) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  await dbConnect();
  const q = req.nextUrl.searchParams.get("q")?.trim();
  let filter = {};
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter = {
      $or: ["doctorNo", "firstName", "lastName", "licenseNo", "specialty"].map((f) => ({
        [f]: { $regex: safe, $options: "i" },
      })),
    };
  }
  const specialty = req.nextUrl.searchParams.get("specialty");
  if (specialty) filter.specialty = specialty;
  const doctors = await Doctor.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(doctors);
}

export async function POST(req) {
  const auth = await requireRole(req, "Admin");
  if (auth.error) return auth.error;
  const body = await readBody(req);
  if (!body) return fail(BAD_BODY);
  const problem = timeOffProblem(body.timeOff);
  if (problem) return fail(problem);
  await dbConnect();
  try {
    const doctor = new Doctor(omit(body, [...SYSTEM_FIELDS, "doctorNo"]));
    await saveWithNumber(doctor, "doctorNo");
    return NextResponse.json(doctor, { status: 201 });
  } catch (err) {
    return fail(friendlyError(err, DUPLICATES));
  }
}
