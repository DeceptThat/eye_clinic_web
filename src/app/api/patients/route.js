import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Patient from "@/models/Patient";
import { requireRole } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { saveWithNumber } from "@/lib/ids";
import { BAD_BODY, SYSTEM_FIELDS, fail, omit, readBody } from "@/lib/http";

export async function GET(req) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  await dbConnect();
  const q = req.nextUrl.searchParams.get("q")?.trim();
  let filter = {};
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter = {
      $or: ["patientNo", "firstName", "lastName", "phone"].map((f) => ({
        [f]: { $regex: safe, $options: "i" },
      })),
    };
  }
  const patients = await Patient.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(patients);
}

export async function POST(req) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  const body = await readBody(req);
  if (!body) return fail(BAD_BODY);
  await dbConnect();
  try {
    
    const patient = new Patient(omit(body, [...SYSTEM_FIELDS, "patientNo"]));
    await saveWithNumber(patient, "patientNo");
    return NextResponse.json(patient, { status: 201 });
  } catch (err) {
    return fail(friendlyError(err));
  }
}
