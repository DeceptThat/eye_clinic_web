import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    category: { type: String, enum: ["Glasses", "Medicine", "Accessory"], required: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    price: { type: Number, required: true, min: 0 },        // THB
    stockQty: { type: Number, required: true, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 5 },     // warn when stock <= this
    expiryDate: Date,                                       // medicine only
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);