import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import "@/models/Patient";
import "@/models/User";
import { requireRole } from "@/lib/auth";

const POPULATE = [
  { path: "patient", select: "patientNo firstName lastName" },
  { path: "soldBy", select: "name username" },
];
const badId = (id) => !mongoose.Types.ObjectId.isValid(id);

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

// Void a sale: PUT { status: "Voided" }  -> stock is returned
export async function PUT(req, { params }) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dbConnect();

  const { status } = await req.json();
  if (status !== "Voided") {
    return NextResponse.json({ error: "Only voiding a sale is allowed" }, { status: 400 });
  }

  // Only a Completed sale can be voided (prevents returning stock twice)
  const sale = await Sale.findOneAndUpdate(
    { _id: id, status: "Completed" },
    { status: "Voided", voidedAt: new Date() },
    { new: true }
  );
  if (!sale) return NextResponse.json({ error: "Sale not found or already voided" }, { status: 409 });

  for (const item of sale.items) {
    await Product.updateOne({ _id: item.product }, { $inc: { stockQty: item.qty } });
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