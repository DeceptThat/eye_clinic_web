import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import Patient from "@/models/Patient";
import Appointment from "@/models/Appointment";
import "@/models/User";
import { requireRole } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { saveWithNumber } from "@/lib/ids";
import { BAD_BODY, bangkokDay, fail, isId, readBody } from "@/lib/http";

const POPULATE = [
  { path: "patient", select: "patientNo firstName lastName" },
  { path: "soldBy", select: "name username" },
];


export async function GET(req) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  const sp = req.nextUrl.searchParams;
  const filter = {};
  const date = sp.get("date");
  if (date) {
    const day = bangkokDay(date);
    if (!day) return fail("Date is not valid");
    filter.saleDate = { $gte: day.start, $lt: day.end };
  }
  if (sp.get("status")) filter.status = sp.get("status");
  if (sp.get("paymentMethod")) filter.paymentMethod = sp.get("paymentMethod");
  for (const [key, label] of [["patient", "Patient"], ["soldBy", "Seller"]]) {
    const v = sp.get(key);
    if (!v) continue;
    if (!isId(v)) return fail(`${label} id is not valid`);
    filter[key] = v;
  }

  await dbConnect();

  const sales = await Sale.find(filter).sort({ saleDate: -1 }).populate(POPULATE);
  return NextResponse.json(sales);
}

export async function POST(req) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  const body = await readBody(req);
  if (!body) return fail(BAD_BODY);
  await dbConnect();

  const { items, paymentMethod } = body;
  let patient = body.patient;
  if (!["Cash", "Card", "QR transfer"].includes(paymentMethod)) {
    return fail("Choose a payment method: Cash, Card or QR transfer");
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Add at least one item" }, { status: 400 });
  }

  
  const qtyById = {};
  for (const it of items) {
    const qty = Number(it?.qty);
    if (!isId(it?.product)) {
      return NextResponse.json({ error: "Choose a product for every line" }, { status: 400 });
    }
    if (!Number.isInteger(qty) || qty < 1) {
      return NextResponse.json({ error: "Quantity must be a whole number of at least 1" }, { status: 400 });
    }
    qtyById[it.product] = (qtyById[it.product] || 0) + qty;
  }

  
  let appointment = null;
  if (body.appointment) {
    if (!isId(body.appointment)) {
      return NextResponse.json({ error: "Invalid appointment" }, { status: 400 });
    }
    appointment = await Appointment.findById(body.appointment);
    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    if (appointment.status === "Cancelled") {
      return NextResponse.json({ error: "This appointment was cancelled" }, { status: 409 });
    }
    if (appointment.checkedOutAt) {
      return NextResponse.json({ error: "This visit has already been checked out" }, { status: 409 });
    }
    patient = String(appointment.patient);
  }

  if (patient && !(isId(patient) && (await Patient.exists({ _id: patient })))) {
    return NextResponse.json({ error: "Patient not found" }, { status: 400 });
  }

  
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
      { returnDocument: "after" }
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
    lines.push({ product: p._id, name: p.name, sku: p.sku, qty, unitPrice: p.price }); 
  }

  const total = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);

  try {
    const sale = new Sale({
      patient: patient || undefined,
      appointment: appointment?._id,
      items: lines,
      total,
      paymentMethod,
      soldBy: auth.user.id,
    });
    await saveWithNumber(sale, "saleNo"); 
    if (appointment) {
      await Appointment.updateOne({ _id: appointment._id }, { status: "Completed", checkedOutAt: new Date() });
    }
    return NextResponse.json(await sale.populate(POPULATE), { status: 201 });
  } catch (err) {
    await giveBack();
    return fail(friendlyError(err));
  }
}