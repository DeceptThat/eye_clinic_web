import mongoose from "mongoose";
import { timestampId } from "@/lib/ids";

const PatientSchema = new mongoose.Schema(
  {
    patientNo: { type: String, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    phone: { type: String, required: true },
    email: String,
    address: String,
    medicalNotes: String,
  },
  { timestamps: true }
);

// Give every new patient a number; if two are created in the same second, add -2, -3...
PatientSchema.pre("validate", async function () {
  if (this.patientNo) return;
  const base = timestampId("P");
  let no = base;
  let n = 1;
  while (await this.constructor.exists({ patientNo: no })) no = `${base}-${++n}`;
  this.patientNo = no;
});

export default mongoose.models.Patient || mongoose.model("Patient", PatientSchema);