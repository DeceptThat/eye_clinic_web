import mongoose from "mongoose";
import { assignNumber } from "@/lib/ids";
import { EMAIL, PHONE } from "@/lib/formats";

const PatientSchema = new mongoose.Schema(
  {
    patientNo: { type: String, unique: true, immutable: true },
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },
    dateOfBirth: {
      type: Date,
      required: true,
      validate: { validator: (v) => !v || v <= new Date(), message: "Date of birth can't be in the future" },
    },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    phone: { type: String, trim: true, required: [true, "Phone is required"], ...PHONE },
    email: { type: String, trim: true, ...EMAIL },
    address: String,
    medicalNotes: String,
  },
  { timestamps: true }
);

// Next free number, e.g. P-04102026-031105 (then -2, -3 in the same second)
PatientSchema.pre("validate", async function () {
  await assignNumber(this, "patientNo", "P");
});

export default mongoose.models.Patient || mongoose.model("Patient", PatientSchema);