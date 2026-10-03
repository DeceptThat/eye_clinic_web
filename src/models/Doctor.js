import mongoose from "mongoose";
import { timestampId } from "@/lib/ids";

const DoctorSchema = new mongoose.Schema(
  {
    doctorNo: { type: String, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    specialty: { type: String, enum: ["Optometrist", "Ophthalmologist"], required: true },
    licenseNo: { type: String, required: true, unique: true },
    phone: String,
    email: String,
    workingDays: { type: [String], default: [] }, // e.g. ["Mon", "Wed", "Fri"]
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DoctorSchema.pre("validate", async function () {
  if (this.doctorNo) return;
  const base = timestampId("D");
  let no = base;
  let n = 1;
  while (await this.constructor.exists({ doctorNo: no })) no = `${base}-${++n}`;
  this.doctorNo = no;
});

export default mongoose.models.Doctor || mongoose.model("Doctor", DoctorSchema);