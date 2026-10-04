import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import Sale from "@/models/Sale";
import { requireRole } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { BAD_BODY, fail, isId, readBody } from "@/lib/http";

const badId = (id) => !isId(id);

export async function GET(req, { params }) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dbConnect();
  const product = await Product.findById(id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

// Normal edit:  PUT { name, price, ... }
// Restock:      PUT { restock: 10 }   (adds to current stock)
export async function PUT(req, { params }) {
  const auth = await requireRole(req, "Admin");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const body = await readBody(req);
  if (!body) return fail(BAD_BODY);
  await dbConnect();

  try {
    let product;
    if (body.restock !== undefined) {
      const qty = Number(body.restock);
      if (!Number.isInteger(qty) || qty <= 0) {
        return NextResponse.json({ error: "Restock amount must be a whole number above 0" }, { status: 400 });
      }
      product = await Product.findByIdAndUpdate(id, { $inc: { stockQty: qty } }, { new: true });
    } else {
      // stockQty is ignored here: stock changes only via Restock or sales
      const { _id, createdAt, updatedAt, __v, stockQty, ...update } = body;
      if (update.category !== "Medicine") update.expiryDate = null;
      product = await Product.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    }
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch (err) {
    const msg = friendlyError(err, { sku: "SKU already exists" });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireRole(req, "Admin");
  if (auth.error) return auth.error;
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dbConnect();
  if (await Sale.exists({ "items.product": id })) {
    return NextResponse.json(
      { error: "This product has sales history. Untick Active to stop selling it instead." },
      { status: 409 }
    );
  }
  const product = await Product.findByIdAndDelete(id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}