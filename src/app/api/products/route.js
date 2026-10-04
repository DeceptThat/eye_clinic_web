import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import { requireRole } from "@/lib/auth";

// GET /api/products?q=ray&category=Glasses&lowStock=1
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
  await dbConnect();
  try {
    const product = await Product.create(await req.json());
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    const msg = err.code === 11000 ? "SKU already exists" : err.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}