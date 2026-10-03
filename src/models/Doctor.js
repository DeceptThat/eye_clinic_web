import mongoose from "mongoose";
import { timestampId } from "@/lib/ids";

const DoctorSchema = new mongoose.Schema(
  {
    doctorNo: { type: String, unique: true },
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },
    specialty: { type: String, enum: ["Optometrist", "Ophthalmologist"], required: true },
    licenseNo: { type: String, trim: true, required: true, unique: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    workingDays: { type: [String], default: [] }, // e.g. ["Mon", "Wed", "Fri"]
    isActive: { type: Boolean, default: true },
    timeOff: [
      {
        start: { type: Date, required: true },
        end: { type: Date, required: true },
        reason: {
          type: String,
          enum: ["Leave", "Sick", "Emergency surgery", "Other"],
          default: "Leave",
        },
      },
    ],
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