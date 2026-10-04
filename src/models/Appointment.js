import mongoose from "mongoose";
import { assignNumber } from "@/lib/ids";

const AppointmentSchema = new mongoose.Schema(
  {
    appointmentNo: { type: String, unique: true, immutable: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    dateTime: { type: Date, required: true },
    reason: {
      type: String,
      enum: ["Eye exam", "Follow-up", "Contact lens fitting", "Other"],
      default: "Eye exam",
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    notes: String,
    checkedOutAt: Date, // set when the patient has paid / left at checkout
  },
  { timestamps: true }
);

// Next free number, e.g. A-04102026-031105 (then -2, -3 in the same second)
AppointmentSchema.pre("validate", async function () {
  await assignNumber(this, "appointmentNo", "A");
});

export default mongoose.models.Appointment || mongoose.model("Appointment", AppointmentSchema);