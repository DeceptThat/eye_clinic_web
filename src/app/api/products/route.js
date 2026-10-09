import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import { requireRole } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { BAD_BODY, SYSTEM_FIELDS, fail, omit, readBody } from "@/lib/http";


export async function GET(req) {
  const auth = await requireRole(req);
  if (auth.error) return auth.error;
  await dbConnect();

  const sp = req.nextUrl.searchParams;
  const filter = {};
  const q = sp.get("q")?.trim();
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["name", "brand", "sku"].map((f) => ({ [f]: { $regex: safe, $options: "i" } }));
  }
  if (sp.get("category")) filter.category = sp.get("category");
  if (sp.get("lowStock") === "1") filter.$expr = { $lte: ["$stockQty", "$reorderLevel"] };

  const products = await Product.find(filter).sort({ category: 1, name: 1 });
  return NextResponse.json(products);
}

export async function POST(req) {
  const auth = await requireRole(req, "Admin");
  if (auth.error) return auth.error;
  const body = await readBody(req);
  if (!body) return fail(BAD_BODY);
  await dbConnect();
  try {
    const product = await Product.create(omit(body, SYSTEM_FIELDS));
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    return fail(friendlyError(err, { sku: "SKU already exists" }));
  }
}