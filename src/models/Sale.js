import mongoose from "mongoose";
import { assignNumber } from "@/lib/ids";

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
    saleNo: { type: String, unique: true, immutable: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" }, // optional (walk-in customer)
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" }, // set when sold at checkout of a visit
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

// Next free number, e.g. S-04102026-031105 (then -2, -3 in the same second)
SaleSchema.pre("validate", async function () {
  await assignNumber(this, "saleNo", "S");
});

export default mongoose.models.Sale || mongoose.model("Sale", SaleSchema);