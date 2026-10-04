// Shared format rules (used by the models, so the API checks them on every save)
export const PHONE = {
  match: [/^\+?[\d\s()-]{6,20}$/, "Phone may only contain digits, spaces, +, - and brackets (6–20 characters)"],
};
export const EMAIL = {
  match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email address is not valid"],
  lowercase: true,
};
export const LICENSE = {
  match: [/^[A-Za-z0-9-]{3,20}$/, "Licence no. may only contain letters, numbers and - (3–20 characters)"],
};
export const SKU = {
  match: [/^[A-Z0-9-]{2,20}$/, "SKU may only contain letters, numbers and - (2–20 characters)"],
};
