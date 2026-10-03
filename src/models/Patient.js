import mongoose from "mongoose";

const PatientSchema = new mongoose.Schema(
  {
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

export default mongoose.models.Patient || mongoose.model("Patient", PatientSchema);