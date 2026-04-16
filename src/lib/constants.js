// src/lib/constants.js
// App-wide constants

export const APP_NAME = "Duka Langu";
export const APP_TAGLINE = "Together for the better";
export const APP_VERSION = "1.0.0";

export const ROLES = {
  ADMIN: "admin",
  OFFICE: "office",
  WORKER: "worker",
};

export const UNITS = [
  { value: "piece", label: "Piece" },
  { value: "kg", label: "Kg" },
  { value: "g", label: "Gram" },
  { value: "litre", label: "Litre" },
  { value: "ml", label: "ml" },
  { value: "dozen", label: "Dozen" },
  { value: "pack", label: "Pack" },
  { value: "box", label: "Box" },
  { value: "metre", label: "Metre" },
];

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "mobile", label: "Mobile Money" },
  { value: "card", label: "Card" },
  { value: "credit", label: "Credit" },
];

export const EXPENSE_CATEGORIES = [
  "Kodi",
  "Umeme",
  "Maji",
  "Mishahara",
  "Usafiri",
  "Vifungashio",
  "Matengenezo",
  "Nyingine",
];

export const TOKEN_STATUS = {
  UNUSED: "unused",
  ACTIVE: "active",
  EXPIRED: "expired",
};
