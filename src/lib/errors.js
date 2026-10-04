// Turns database errors into short messages people can read
const LABELS = {
  firstName: "First name", lastName: "Last name", dateOfBirth: "Date of birth", gender: "Gender",
  phone: "Phone", email: "Email", address: "Address", medicalNotes: "Medical notes",
  specialty: "Specialty", licenseNo: "Licence no.", workingDays: "Working days", timeOff: "Time off",
  patient: "Patient", doctor: "Doctor", dateTime: "Date and time", reason: "Reason", status: "Status",
  name: "Name", brand: "Brand", category: "Category", sku: "SKU", price: "Price",
  stockQty: "Stock", reorderLevel: "Reorder level", expiryDate: "Expiry date",
  username: "Username", role: "Role", paymentMethod: "Payment method", items: "Items",
};

function label(path = "") {
  const last = String(path).split(".").filter((p) => isNaN(p)).pop() || path;
  return LABELS[last] || last.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function oneMessage(e) {
  if (e.name === "CastError" || e.kind === "Date" || e.kind === "Number" || e.kind === "ObjectId") {
    return `${label(e.path)} is not valid`;
  }
  if (e.kind === "required") return `${label(e.path)} is required`;
  if (e.kind === "enum") return `${label(e.path)} must be one of: ${(e.properties?.enumValues || []).join(", ")}`;
  if (e.kind === "min" && /Path/.test(e.message)) return `${label(e.path)} is too small`;
  if (e.kind === "max" && /Path/.test(e.message)) return `${label(e.path)} is too large`;
  return e.message;
}

export function friendlyError(err, duplicates = {}) {
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    return duplicates[field] || `That ${label(field || "value").toLowerCase()} is already in use`;
  }
  if (err?.name === "ValidationError") {
    return [...new Set(Object.values(err.errors).map(oneMessage))].join(". ");
  }
  if (err?.name === "CastError") return `${label(err.path)} is not valid`;
  return "Something went wrong. Please check the details and try again.";
}
