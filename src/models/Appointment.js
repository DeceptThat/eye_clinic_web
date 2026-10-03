import mongoose from "mongoose";
import { timestampId } from "@/lib/ids";

const AppointmentSchema = new mongoose.Schema(
  {
    appointmentNo: { type: String, unique: true },
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
  },
  { timestamps: true }
);

AppointmentSchema.pre("validate", async function () {
  if (this.appointmentNo) return;
  const base = timestampId("A");
  let no = base;
  let n = 1;
  while (await this.constructor.exists({ appointmentNo: no })) no = `${base}-${++n}`;
  this.appointmentNo = no;
});

export default mongoose.models.Appointment || mongoose.model("Appointment", AppointmentSchema);