import mongoose from "mongoose";
import { SKU } from "@/lib/formats";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    category: { type: String, enum: ["Glasses", "Medicine", "Accessory"], required: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true, ...SKU },
    price: { type: Number, required: true, min: [0, "Price cannot be negative"] },        
    stockQty: {
      type: Number, required: true, min: [0, "Stock cannot be negative"], default: 0,
      validate: { validator: Number.isInteger, message: "Stock must be a whole number" },
    },
    reorderLevel: {
      type: Number, min: [0, "Reorder level cannot be negative"], default: 5, 
      validate: { validator: Number.isInteger, message: "Reorder level must be a whole number" },
    },
    expiryDate: Date,                                       
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);