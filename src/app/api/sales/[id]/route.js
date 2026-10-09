import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import Appointment from "@/models/Appointment";
import "@/models/Patient";
import "@/models/User";
import { requireRole } from "@/lib/auth";
import { BAD_BODY, fail, isId, readBody } from "@/lib/http";

const POPULATE = [
  { path: "patient", select: "patientNo firstName lastName" },
  { path: "soldBy", select: "name username" },
];
const badId = (id) => !isId(id);

export async function GET(req, { params }) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dbConnect();
  const sale = await Sale.findById(id).populate(POPULATE);
  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sale);
}


export async function PUT(req, { params }) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const body = await readBody(req);
  if (!body) return fail(BAD_BODY);
  await dbConnect();

  if (body.status !== "Voided") {
    return NextResponse.json({ error: "Only voiding a sale is allowed" }, { status: 400 });
  }

  
  const sale = await Sale.findOneAndUpdate(
    { _id: id, status: "Completed" },
    { status: "Voided", voidedAt: new Date() },
    { returnDocument: "after" }
  );
  if (!sale) return NextResponse.json({ error: "Sale not found or already voided" }, { status: 409 });

  for (const item of sale.items) {
    await Product.updateOne({ _id: item.product }, { $inc: { stockQty: item.qty } });
  }
  
  if (sale.appointment) {
    await Appointment.updateOne({ _id: sale.appointment }, { $unset: { checkedOutAt: 1 } });
  }
  return NextResponse.json(await sale.populate(POPULATE));
}

export async function DELETE(req, { params }) {
  const auth = await requireRole(req, "Admin");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dbConnect();

  const sale = await Sale.findById(id);
  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sale.status !== "Voided") {
    return NextResponse.json({ error: "Void the sale first, so its stock is returned" }, { status: 409 });
  }
  await sale.deleteOne();
  return NextResponse.json({ ok: true });
}