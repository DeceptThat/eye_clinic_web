import mongoose from "mongoose";
import { assignNumber } from "@/lib/ids";
import { EMAIL, LICENSE, PHONE } from "@/lib/formats";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DoctorSchema = new mongoose.Schema(
  {
    doctorNo: { type: String, unique: true, immutable: true },
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },
    specialty: { type: String, enum: ["Optometrist", "Ophthalmologist"], required: true },
    licenseNo: { type: String, trim: true, required: [true, "Licence no. is required"], unique: true, ...LICENSE },
    phone: { type: String, trim: true, ...PHONE },
    email: { type: String, trim: true, ...EMAIL },
    workingDays: {
      type: [{ type: String, enum: { values: DAYS, message: "Working days must be Mon–Sun" } }],
      default: [],
    }, 
    isActive: { type: Boolean, default: true },
    timeOff: [
      {
        start: { type: Date, required: true },
        end: {
          type: Date,
          required: true,
          validate: {
            
            validator(v) { return !(this?.start instanceof Date) || v > this.start; },
            message: "Time off must end after it starts",
          },
        },
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
  await assignNumber(this, "doctorNo", "D");
});

export default mongoose.models.Doctor || mongoose.model("Doctor", DoctorSchema);

export function timeOffProblem(list) {
  if (list === undefined) return null;
  if (!Array.isArray(list)) return "Time off is not valid";
  for (const t of list) {
    const start = new Date(t?.start);
    const end = new Date(t?.end);
    if (!t?.start || !t?.end || isNaN(start) || isNaN(end)) return "Every time-off entry needs a valid start and end";
    if (end <= start) return "Time off must end after it starts";
  }
  return null;
}
