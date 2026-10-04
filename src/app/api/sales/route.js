import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import Patient from "@/models/Patient";
import "@/models/User";
import { requireRole } from "@/lib/auth";

const POPULATE = [
  { path: "patient", select: "patientNo firstName lastName" },
  { path: "soldBy", select: "name username" },
];

// GET /api/sales?date=2026-10-04&status=Completed&paymentMethod=Cash
export async function GET(req) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  await dbConnect();

  const sp = req.nextUrl.searchParams;
  const filter = {};
  const date = sp.get("date");
  if (date) {
    const start = new Date(`${date}T00:00:00+07:00`);
    filter.saleDate = { $gte: start, $lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
  }
  if (sp.get("status")) filter.status = sp.get("status");
  if (sp.get("paymentMethod")) filter.paymentMethod = sp.get("paymentMethod");

  const sales = await Sale.find(filter).sort({ saleDate: -1 }).populate(POPULATE);
  return NextResponse.json(sales);
}

export async function POST(req) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  await dbConnect();

  const { patient, items, paymentMethod } = await req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Add at least one item" }, { status: 400 });
  }

  // Combine repeated products and check quantities
  const qtyById = {};
  for (const it of items) {
    const qty = Number(it.qty);
    if (!mongoose.Types.ObjectId.isValid(it.product)) {
      return NextResponse.json({ error: "Choose a product for every line" }, { status: 400 });
    }
    if (!Number.isInteger(qty) || qty < 1) {
      return NextResponse.json({ error: "Quantity must be a whole number of at least 1" }, { status: 400 });
    }
    qtyById[it.product] = (qtyById[it.product] || 0) + qty;
  }

  if (patient && !(await Patient.exists({ _id: patient }))) {
    return NextResponse.json({ error: "Patient not found" }, { status: 400 });
  }

  // Take stock one product at a time; if any fails, give back what was taken
  const taken = [];
  const lines = [];
  const giveBack = async () => {
    for (const t of taken) await Product.updateOne({ _id: t.id }, { $inc: { stockQty: t.qty } });
  };

  for (const [id, qty] of Object.entries(qtyById)) {
    const p = await Product.findOneAndUpdate(
      {
        _id: id,
        isActive: true,
        stockQty: { $gte: qty },
        $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }],
      },
      { $inc: { stockQty: -qty } },
      { new: true }
    );
    if (!p) {
      await giveBack();
      const prod = await Product.findById(id);
      let msg = "A product was not found";
      if (prod && !prod.isActive) msg = `${prod.name} is not for sale`;
      else if (prod?.expiryDate && prod.expiryDate < new Date()) msg = `${prod.name} is expired`;
      else if (prod) msg = `Only ${prod.stockQty} × ${prod.name} left in stock`;
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    taken.push({ id, qty });
    lines.push({ product: p._id, name: p.name, sku: p.sku, qty, unitPrice: p.price }); // price from DB, not browser
  }

  const total = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);

  try {
    const sale = await Sale.create({
      patient: patient || undefined,
      items: lines,
      total,
      paymentMethod,
      soldBy: auth.user.id,
    });
    return NextResponse.json(await sale.populate(POPULATE), { status: 201 });
  } catch (err) {
    await giveBack();
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}