import mongoose from "mongoose";
import { timestampId } from "@/lib/ids";

const SaleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: String,   // copied at time of sale, so receipts stay correct
    sku: String,
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new mongoose.Schema(
  {
    saleNo: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" }, // optional (walk-in customer)
    items: {
      type: [SaleItemSchema],
      validate: [(v) => v.length > 0, "A sale needs at least one item"],
    },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["Cash", "Card", "QR transfer"], required: true },
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    saleDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["Completed", "Voided"], default: "Completed" },
    voidedAt: Date,
  },
  { timestamps: true }
);

SaleSchema.pre("validate", async function () {
  if (this.saleNo) return;
  const base = timestampId("S");
  let no = base;
  let n = 1;
  while (await this.constructor.exists({ saleNo: no })) no = `${base}-${++n}`;
  this.saleNo = no;
});

export default mongoose.models.Sale || mongoose.model("Sale", SaleSchema);