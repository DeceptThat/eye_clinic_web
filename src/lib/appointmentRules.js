import Doctor from "@/models/Doctor";
import Patient from "@/models/Patient";
import Appointment from "@/models/Appointment";

export const SLOT_MINUTES = 30;

// "Mon", "Tue"... in Thailand time (works the same on your PC and on the VM)
function weekdayInBangkok(date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Bangkok" }).format(date);
}

// Returns an error message, or null if the booking is allowed
export async function checkBooking({ patientId, doctorId, dateTime, excludeId, checkPast = true }) {
  const when = new Date(dateTime);
  if (isNaN(when.getTime())) return "Please choose a valid date and time";
  if (checkPast && when < new Date()) return "Cannot book an appointment in the past";

  if (!(await Patient.exists({ _id: patientId }))) return "Patient not found";

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return "Doctor not found";
  const name = `Dr. ${doctor.firstName} ${doctor.lastName}`;

  if (!doctor.isActive) return `${name} is inactive and cannot be booked`;

  const day = weekdayInBangkok(when);
  if (!doctor.workingDays.includes(day)) {
    return `${name} does not work on ${day} (works ${doctor.workingDays.join(", ") || "no days"})`;
  }

  const slotEnd = new Date(when.getTime() + SLOT_MINUTES * 60000);
  const off = (doctor.timeOff || []).find((t) => t.start < slotEnd && when < t.end);
  if (off) return `${name} is unavailable (${off.reason}) at this time`;

  const clashFilter = {
    doctor: doctorId,
    status: "Scheduled",
    dateTime: { $gt: new Date(when.getTime() - SLOT_MINUTES * 60000), $lt: slotEnd },
  };
  if (excludeId) clashFilter._id = { $ne: excludeId };
  if (await Appointment.exists(clashFilter)) {
    return `${name} already has an appointment within ${SLOT_MINUTES} minutes of this time`;
  }

  const patientClash = {
    patient: patientId,
    status: "Scheduled",
    dateTime: { $gt: new Date(when.getTime() - SLOT_MINUTES * 60000), $lt: slotEnd },
  };
  if (excludeId) patientClash._id = { $ne: excludeId };
  if (await Appointment.exists(patientClash)) {
    return "This patient already has an appointment around this time";
  }

  return null;
}